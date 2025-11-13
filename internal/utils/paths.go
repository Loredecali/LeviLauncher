package utils

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/liteldev/LeviLauncher/internal/config"
)

// LauncherDir returns the directory where the executable resides.
func LauncherDir() string {
	exe, err := os.Executable()
	if err != nil {
		// fallback to current working directory
		cwd, _ := os.Getwd()
		return cwd
	}
	return filepath.Dir(exe)
}

func BaseRoot() string {
	if v := strings.TrimSpace(config.GetBaseRootOverride()); v != "" {
		_ = os.MkdirAll(v, 0o755)
		return v
	}
	if la := strings.TrimSpace(os.Getenv("LOCALAPPDATA")); la != "" {
		root := filepath.Join(la, "LeviLauncher")
		_ = os.MkdirAll(root, 0o755)
		return root
	}
	if d, _ := os.UserCacheDir(); strings.TrimSpace(d) != "" {
		root := filepath.Join(d, "LeviLauncher")
		_ = os.MkdirAll(root, 0o755)
		return root
	}
	// fallback to executable dir
	root := filepath.Join(LauncherDir(), "LeviLauncher")
	_ = os.MkdirAll(root, 0o755)
	return root
}

// GetInstallerDir returns the installers storage directory under the launcher directory.
// It ensures the directory exists and returns the absolute path.
func GetInstallerDir() (string, error) {
	base := BaseRoot()
	dir := filepath.Join(base, "installers")
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if mkErr := os.MkdirAll(dir, 0o755); mkErr != nil {
			return "", mkErr
		}
	}
	return dir, nil
}

func GetVersionsDir() (string, error) {
	base := BaseRoot()
	dir := filepath.Join(base, "versions")
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if mkErr := os.MkdirAll(dir, 0o755); mkErr != nil {
			return "", mkErr
		}
	}
	return dir, nil
}

func CanWriteDir(p string) bool {
	v := strings.TrimSpace(p)
	if v == "" {
		return false
	}
	if !filepath.IsAbs(v) {
		return false
	}
	if err := os.MkdirAll(v, 0o755); err != nil {
		return false
	}
	tf := filepath.Join(v, ".ll_write_test.tmp")
	f, err := os.Create(tf)
	if err != nil {
		return false
	}
	_, werr := f.Write([]byte("ok"))
	cerr := f.Close()
	_ = os.Remove(tf)
	return werr == nil && cerr == nil
}
