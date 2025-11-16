package peeditor

import (
	"bytes"
	"context"
	"crypto/sha256"
	_ "embed"
	"github.com/wailsapp/wails/v3/pkg/application"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
)

const (
	EventEnsureStart = "peeditor.ensure.start"
	EventEnsureDone  = "peeditor.ensure.done"
)

//go:embed PeEditor.exe
var embeddedPeEditor []byte

func bytesSHA256(b []byte) []byte { h := sha256.Sum256(b); return h[:] }

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
	return h.Sum(nil), nil
}

func EnsureForVersion(ctx context.Context, versionDir string) bool {
	dir := strings.TrimSpace(versionDir)
	if dir == "" {
		application.Get().Event.Emit(EventEnsureDone, false)
		return false
	}
    application.Get().Event.Emit(EventEnsureStart, struct{}{})
	if len(embeddedPeEditor) == 0 {
		application.Get().Event.Emit(EventEnsureDone, false)
		return false
	}
	dest := filepath.Join(dir, "PeEditor.exe")
	needWrite := true
	if fi, err := os.Stat(dest); err == nil && fi.Size() > 0 {
		if fh, err := fileSHA256(dest); err == nil {
			if bytes.Equal(fh, bytesSHA256(embeddedPeEditor)) {
				needWrite = false
			}
		}
	}
	if needWrite {
		_ = os.MkdirAll(dir, 0755)
		tmp := dest + ".tmp"
		if err := os.WriteFile(tmp, embeddedPeEditor, 0755); err != nil {
			_ = os.Remove(tmp)
			application.Get().Event.Emit(EventEnsureDone, false)
			return false
		}
		if err := os.Rename(tmp, dest); err != nil {
			_ = os.Remove(tmp)
			application.Get().Event.Emit(EventEnsureDone, false)
			return false
		}
	}
	application.Get().Event.Emit(EventEnsureDone, true)
	return true
}

func RunForVersion(ctx context.Context, versionDir string) bool {
	dir := strings.TrimSpace(versionDir)
	if dir == "" {
		application.Get().Event.Emit(EventEnsureDone, false)
		return false
	}
	exe := filepath.Join(dir, "Minecraft.Windows.exe")
	tool := filepath.Join(dir, "PeEditor.exe")
	bak := filepath.Join(dir, "Minecraft.Windows.exe.bak")
	if fileExists(bak) {
		return true
	}
	if !fileExists(tool) || !fileExists(exe) {
		application.Get().Event.Emit(EventEnsureDone, false)
		return false
	}
    application.Get().Event.Emit(EventEnsureStart, struct{}{})
	cmd := exec.Command(tool, "-m", "-b", "--inplace", "--exe", "./Minecraft.Windows.exe")
	cmd.Dir = dir
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	_ = cmd.Run()
	application.Get().Event.Emit(EventEnsureDone, true)
	return true
}

func fileExists(p string) bool {
	if fi, err := os.Stat(p); err == nil && !fi.IsDir() {
		return true
	}
	return false
}
