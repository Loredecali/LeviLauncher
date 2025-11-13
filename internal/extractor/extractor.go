package extractor

import (
	"bytes"
	"crypto/sha256"
	_ "embed"
	"io"
	"os"
	"path/filepath"
	"syscall"
	"sync"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	loadOnce sync.Once
	loadErr  error
	miProc   *windows.LazyProc
	useWide  bool
	nhBegin  *windows.LazyProc
	nhProg   *windows.LazyProc
	nhWait   *windows.LazyProc
	nhCancel *windows.LazyProc
	nhClose  *windows.LazyProc
	// kernel32 helpers
	k32                     *windows.LazyDLL
	pWideCharToMultiByte    *windows.LazyProc
)

//go:embed launcher_core.dll
var embeddedLauncherCoreDLL []byte

func prepareDLL() (string, error) {
	if len(embeddedLauncherCoreDLL) == 0 {
		return "", nil
	}

	base := os.Getenv("LOCALAPPDATA")
	if base == "" {
		if d, err := os.UserCacheDir(); err == nil {
			base = d
		}
	}
	if base == "" {
		return "", nil
	}
	dir := filepath.Join(base, "LeviLauncher", "bin")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	target := filepath.Join(dir, "launcher_core.dll")
	// Verify hash and write if missing or mismatched
	needWrite := false
	if fi, err := os.Stat(target); err != nil || fi.Size() == 0 {
		needWrite = true
	} else {
		if fh, err := fileSHA256(target); err != nil {
			needWrite = true
		} else {
			eh := bytesSHA256(embeddedLauncherCoreDLL)
			if !bytes.Equal(fh, eh) {
				needWrite = true
			}
		}
	}
	if needWrite {
		tmp := target + ".tmp"
		if err := os.WriteFile(tmp, embeddedLauncherCoreDLL, 0644); err != nil {
			return "", err
		}
		if err := os.Rename(tmp, target); err != nil {
			// best-effort cleanup
			_ = os.Remove(tmp)
			return "", err
		}
	}
	return target, nil
}

func fileSHA256(p string) ([]byte, error) {
	f, err := os.Open(p)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return nil, err
	}
	sum := h.Sum(nil)
	return sum, nil
}

func bytesSHA256(b []byte) []byte {
	h := sha256.Sum256(b)
	return h[:]
}

func ensureLoaded() error {
	loadOnce.Do(func() {
		name := os.Getenv("LAUNCHER_CORE_DLL")
		if name == "" {
			if p, err := prepareDLL(); err == nil && p != "" {
				_ = os.Setenv("LAUNCHER_CORE_DLL", p)
				name = p
			}
		}
		if name == "" {
			name = "launcher_core.dll"
		}
		dll := windows.NewLazyDLL(name)
		// Prefer wide-character entry if available
		wide := dll.NewProc("miHoYoW")
		ansi := dll.NewProc("miHoYo")
		// Optional progress-capable APIs; their absence is allowed
		//nhBegin = dll.NewProc("nh_extract_begin")
		//nhProg = dll.NewProc("nh_extract_progress")
		//nhWait = dll.NewProc("nh_extract_wait")
		//nhCancel = dll.NewProc("nh_extract_cancel")
		//nhClose = dll.NewProc("nh_extract_close")
		if err := dll.Load(); err != nil {
			loadErr = err
			return
		}
		// Decide which proc to use
		if err := wide.Find(); err == nil {
			miProc = wide
			useWide = true
		} else if err := ansi.Find(); err == nil {
			miProc = ansi
			useWide = false
		} else {
			loadErr = ansi.Find() // return last error
			return
		}

		// Load kernel32 helpers for ANSI conversion fallback
		k32 = windows.NewLazyDLL("kernel32.dll")
		pWideCharToMultiByte = k32.NewProc("WideCharToMultiByte")
		_ = k32.Load() // best-effort; if it fails, ANSI conversion path will error out when used
	})
	return loadErr
}

func Init() {
	_ = ensureLoaded()
}

// MiHoYo calls the exported nh_extract function from the DLL at runtime.
// Returns (rc, errmsg). rc == 0 indicates success.
func MiHoYo(msixvcPath string, outDir string) (int, string) {
	if err := ensureLoaded(); err != nil {
		return 1, err.Error()
	}

	var r1 uintptr
	if useWide {
		cMsix16, err := windows.UTF16PtrFromString(msixvcPath)
		if err != nil {
			return 1, err.Error()
		}
		cOut16, err := windows.UTF16PtrFromString(outDir)
		if err != nil {
			return 1, err.Error()
		}
		r1, _, _ = miProc.Call(
			uintptr(unsafe.Pointer(cMsix16)),
			uintptr(unsafe.Pointer(cOut16)),
		)
	} else {
		// Convert UTF-8 -> UTF-16 -> ANSI (ACP) to avoid garbled non-ASCII
		bMsix, err := utf8ToACP(msixvcPath)
		if err != nil {
			return 1, err.Error()
		}
		bOut, err := utf8ToACP(outDir)
		if err != nil {
			return 1, err.Error()
		}
		r1, _, _ = miProc.Call(
			uintptr(unsafe.Pointer(&bMsix[0])),
			uintptr(unsafe.Pointer(&bOut[0])),
		)
	}

	rc := int(r1)
	if rc == 0 {
		return 0, ""
	}

	return rc, ""
}

// utf8ToACP converts a Go UTF-8 string to the current Windows ANSI code page bytes with a trailing NUL.
// Returns a byte slice that must remain alive until after the DLL call.
func utf8ToACP(s string) ([]byte, error) {
	// Convert to UTF-16 (without the implicit terminating NUL in length)
	u16, err := windows.UTF16FromString(s)
	if err != nil {
		return nil, err
	}
	if len(u16) == 0 {
		return []byte{0}, nil
	}
	// Compute required buffer size (excluding NUL). len(u16)-1 to exclude terminating NUL from source count
	const CP_ACP = 0
	r0, _, e1 := pWideCharToMultiByte.Call(
		uintptr(uint32(CP_ACP)),
		0,
		uintptr(unsafe.Pointer(&u16[0])),
		uintptr(len(u16)-1),
		0,
		0,
		0,
		0,
	)
	if r0 == 0 {
		if e1 != nil {
			return nil, e1
		}
		return nil, syscall.EINVAL
	}
	buf := make([]byte, r0+1)
	r1, _, e2 := pWideCharToMultiByte.Call(
		uintptr(uint32(CP_ACP)),
		0,
		uintptr(unsafe.Pointer(&u16[0])),
		uintptr(len(u16)-1),
		uintptr(unsafe.Pointer(&buf[0])),
		r0,
		0,
		0,
	)
	if r1 == 0 {
		if e2 != nil {
			return nil, e2
		}
		return nil, syscall.EINVAL
	}
	buf[r0] = 0
	return buf, nil
}
