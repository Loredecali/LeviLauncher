package explorer

import (
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"

	"github.com/liteldev/LeviLauncher/internal/utils"
)

// OpenPath opens a directory path in Explorer via powershell to ensure compatibility.
func OpenPath(dir string) bool {
	d := strings.TrimSpace(dir)
	if d == "" {
		return false
	}
	if !utils.DirExists(d) {
		if err := os.MkdirAll(d, 0755); err != nil {
			return false
		}
	}
	cmd := exec.Command("powershell", "explorer \""+d+"\"")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if err := cmd.Run(); err != nil {
		log.Println("explorer.OpenPath error:", err)
		return false
	}
	return true
}

// SelectFile selects the given file in Explorer.
func SelectFile(path string) bool {
	p := strings.TrimSpace(path)
	if p == "" || !utils.FileExists(p) {
		return false
	}
	cmd := exec.Command("explorer", "/select,\""+p+"\"")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if err := cmd.Run(); err != nil {
		log.Println("explorer.SelectFile error:", err)
		return false
	}
	return true
}

// OpenMods opens versions/<name>/mods under the launcher versions directory.
func OpenMods(name string) bool {
	n := strings.TrimSpace(name)
	if n == "" {
		return false
	}
	vdir, err := utils.GetVersionsDir()
	if err != nil || strings.TrimSpace(vdir) == "" {
		return false
	}
	dir := filepath.Join(vdir, n, "mods")
	return OpenPath(dir)
}

// OpenWorlds opens the worlds directory under GDK data path.
func OpenWorlds(isPreview bool) bool {
	dir := filepath.Join(utils.GetMinecraftGDKDataPath(isPreview), "worlds")
	return OpenPath(dir)
}

// OpenInstallers opens the installers directory.
func OpenInstallers() bool {
	dir, err := utils.GetInstallerDir()
	if err != nil || dir == "" {
		return false
	}
	return OpenPath(dir)
}
