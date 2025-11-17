package content

import (
	"archive/zip"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/liteldev/LeviLauncher/internal/types"
	"github.com/liteldev/LeviLauncher/internal/utils"
)

type bedrockManifest struct {
	FormatVersion int `json:"format_version"`
	Header        struct {
		Name             string `json:"name"`
		Description      string `json:"description"`
		MinEngineVersion []int  `json:"min_engine_version"`
		Uuid             string `json:"uuid"`
		Version          []int  `json:"version"`
	} `json:"header"`
	Modules []struct {
		Type    string `json:"type"`
		Uuid    string `json:"uuid"`
		Version []int  `json:"version"`
	} `json:"modules"`
}

func findManifestDir(dir string) string {
    d := strings.TrimSpace(dir)
    if d == "" {
        return ""
    }
    if utils.FileExists(filepath.Join(d, "manifest.json")) {
        return d
    }
    fi, err := os.Stat(d)
    if err != nil || !fi.IsDir() {
        return ""
    }
    queue := []string{d}
    seen := map[string]struct{}{}
    for len(queue) > 0 {
        cur := queue[0]
        queue = queue[1:]
        if _, ok := seen[cur]; ok {
            continue
        }
        seen[cur] = struct{}{}
        ents, er := os.ReadDir(cur)
        if er != nil {
            continue
        }
        for _, e := range ents {
            if !e.IsDir() {
                continue
            }
            sub := filepath.Join(cur, e.Name())
            if utils.FileExists(filepath.Join(sub, "manifest.json")) {
                return sub
            }
            queue = append(queue, sub)
        }
    }
    return ""
}

func ImportMcpackToDirs(data []byte, archiveName string, resDir string, bpDir string, overwrite bool) string {
	if len(data) == 0 || (strings.TrimSpace(resDir) == "" && strings.TrimSpace(bpDir) == "") {
		return "ERR_OPEN_ZIP"
	}
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "ERR_OPEN_ZIP"
	}
	manifestDir := ""
	var manifest bedrockManifest
	for _, f := range zr.File {
		nameInZip := strings.TrimPrefix(f.Name, "./")
		if strings.HasSuffix(nameInZip, "/") {
			continue
		}
		if strings.EqualFold(filepath.Base(nameInZip), "manifest.json") {
			dir := filepath.Dir(nameInZip)
			rc, er := f.Open()
			if er == nil {
				b, _ := io.ReadAll(rc)
				_ = rc.Close()
				_ = json.Unmarshal(b, &manifest)
			}
			if dir != "." && strings.TrimSpace(dir) != "" {
				manifestDir = dir
			}
			break
		}
	}
	if manifestDir == "" && len(manifest.Modules) == 0 {
		return "ERR_MANIFEST_NOT_FOUND"
	}
	baseName := strings.TrimSpace(archiveName)
	if baseName != "" {
		baseName = strings.TrimSuffix(filepath.Base(baseName), filepath.Ext(baseName))
	}
	baseName = utils.SanitizeFilename(baseName)
	if strings.TrimSpace(baseName) == "" {
		baseName = "pack"
	}
	if strings.TrimSpace(baseName) == "" || baseName == "." || baseName == string(os.PathSeparator) {
		return "ERR_INVALID_PACKAGE"
	}
	targets := make([]string, 0, 2)
	hasRes := false
	hasData := false
	for _, m := range manifest.Modules {
		tp := strings.ToLower(strings.TrimSpace(m.Type))
		if tp == "resources" && strings.TrimSpace(resDir) != "" {
			targets = append(targets, filepath.Join(resDir, baseName))
			hasRes = true
		} else if tp == "data" && strings.TrimSpace(bpDir) != "" {
			targets = append(targets, filepath.Join(bpDir, baseName))
			hasData = true
		}
	}
	if !hasRes && !hasData {
		return "ERR_INVALID_PACKAGE"
	}
	for _, targetRoot := range targets {
		if utils.DirExists(targetRoot) {
			if overwrite {
				if err := utils.RemoveDir(targetRoot); err != nil {
					return "ERR_WRITE_FILE"
				}
			} else {
				return "ERR_DUPLICATE_FOLDER"
			}
		}
		for _, f := range zr.File {
			nameInZip := strings.TrimPrefix(f.Name, "./")
			var relInDir string
			if manifestDir != "" {
				if nameInZip != manifestDir && !strings.HasPrefix(nameInZip, manifestDir+"/") {
					continue
				}
				relInDir = strings.TrimPrefix(strings.TrimPrefix(nameInZip, manifestDir), "/")
			} else {
				relInDir = nameInZip
			}
			target := targetRoot
			if relInDir != "" && relInDir != "/" {
				target = filepath.Join(targetRoot, relInDir)
			}
			safeTarget, _ := filepath.Abs(target)
			safeRoot, _ := filepath.Abs(targetRoot)
			if !strings.HasPrefix(strings.ToLower(safeTarget), strings.ToLower(safeRoot+string(os.PathSeparator))) && strings.ToLower(safeTarget) != strings.ToLower(safeRoot) {
				continue
			}
			if f.FileInfo().IsDir() || strings.HasSuffix(f.Name, "/") {
				if err := os.MkdirAll(target, 0755); err != nil {
					return "ERR_CREATE_TARGET_DIR"
				}
				continue
			}
			if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
				return "ERR_CREATE_TARGET_DIR"
			}
			rc, err := f.Open()
			if err != nil {
				return "ERR_READ_ZIP_ENTRY"
			}
			out, er := os.Create(target)
			if er != nil {
				rc.Close()
				return "ERR_WRITE_FILE"
			}
			if _, er = io.Copy(out, rc); er != nil {
				out.Close()
				rc.Close()
				return "ERR_WRITE_FILE"
			}
			out.Close()
			rc.Close()
		}
	}
	return ""
}

func ImportMcpackToDirs2(data []byte, archiveName string, resDir string, bpDir string, skinDir string, overwrite bool) string {
    if len(data) == 0 || (strings.TrimSpace(resDir) == "" && strings.TrimSpace(bpDir) == "" && strings.TrimSpace(skinDir) == "") {
        return "ERR_OPEN_ZIP"
    }
    zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
    if err != nil {
        return "ERR_OPEN_ZIP"
    }
    manifestDir := ""
    var manifest bedrockManifest
    for _, f := range zr.File {
        nameInZip := strings.TrimPrefix(f.Name, "./")
        if strings.HasSuffix(nameInZip, "/") {
            continue
        }
        if strings.EqualFold(filepath.Base(nameInZip), "manifest.json") {
            dir := filepath.Dir(nameInZip)
            rc, er := f.Open()
            if er == nil {
                b, _ := io.ReadAll(rc)
                _ = rc.Close()
                _ = json.Unmarshal(b, &manifest)
            }
            if dir != "." && strings.TrimSpace(dir) != "" {
                manifestDir = dir
            }
            break
        }
    }
    if manifestDir == "" && len(manifest.Modules) == 0 {
        return "ERR_MANIFEST_NOT_FOUND"
    }
    baseName := strings.TrimSpace(archiveName)
    if baseName != "" {
        baseName = strings.TrimSuffix(filepath.Base(baseName), filepath.Ext(baseName))
    }
    baseName = utils.SanitizeFilename(baseName)
    if strings.TrimSpace(baseName) == "" {
        baseName = "pack"
    }
    if strings.TrimSpace(baseName) == "" || baseName == "." || baseName == string(os.PathSeparator) {
        return "ERR_INVALID_PACKAGE"
    }
    targets := make([]string, 0, 3)
    hasAny := false
    for _, m := range manifest.Modules {
        tp := strings.ToLower(strings.TrimSpace(m.Type))
        if tp == "resources" && strings.TrimSpace(resDir) != "" {
            targets = append(targets, filepath.Join(resDir, baseName))
            hasAny = true
        } else if tp == "data" && strings.TrimSpace(bpDir) != "" {
            targets = append(targets, filepath.Join(bpDir, baseName))
            hasAny = true
        } else if tp == "skin_pack" && strings.TrimSpace(skinDir) != "" {
            targets = append(targets, filepath.Join(skinDir, baseName))
            hasAny = true
        }
    }
    if !hasAny {
        return "ERR_INVALID_PACKAGE"
    }
    for _, targetRoot := range targets {
        if utils.DirExists(targetRoot) {
            if overwrite {
                if err := utils.RemoveDir(targetRoot); err != nil {
                    return "ERR_WRITE_FILE"
                }
            } else {
                return "ERR_DUPLICATE_FOLDER"
            }
        }
        for _, f := range zr.File {
            nameInZip := strings.TrimPrefix(f.Name, "./")
            var relInDir string
            if manifestDir != "" {
                if nameInZip != manifestDir && !strings.HasPrefix(nameInZip, manifestDir+"/") {
                    continue
                }
                relInDir = strings.TrimPrefix(strings.TrimPrefix(nameInZip, manifestDir), "/")
            } else {
                relInDir = nameInZip
            }
            target := targetRoot
            if relInDir != "" && relInDir != "/" {
                target = filepath.Join(targetRoot, relInDir)
            }
            safeTarget, _ := filepath.Abs(target)
            safeRoot, _ := filepath.Abs(targetRoot)
            if !strings.HasPrefix(strings.ToLower(safeTarget), strings.ToLower(safeRoot+string(os.PathSeparator))) && strings.ToLower(safeTarget) != strings.ToLower(safeRoot) {
                continue
            }
            if f.FileInfo().IsDir() || strings.HasSuffix(f.Name, "/") {
                if err := os.MkdirAll(target, 0755); err != nil {
                    return "ERR_CREATE_TARGET_DIR"
                }
                continue
            }
            if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
                return "ERR_CREATE_TARGET_DIR"
            }
            rc, err := f.Open()
            if err != nil {
                return "ERR_READ_ZIP_ENTRY"
            }
            out, er := os.Create(target)
            if er != nil {
                rc.Close()
                return "ERR_WRITE_FILE"
            }
            if _, er = io.Copy(out, rc); er != nil {
                out.Close()
                rc.Close()
                return "ERR_WRITE_FILE"
            }
            out.Close()
            rc.Close()
        }
    }
    return ""
}

func ImportMcaddonToDirs2(data []byte, resDir string, bpDir string, skinDir string, overwrite bool) string {
    if len(data) == 0 {
        return "ERR_OPEN_ZIP"
    }
    zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
    if err != nil {
        return "ERR_OPEN_ZIP"
    }
    imported := false
    for _, f := range zr.File {
        name := strings.TrimSpace(f.Name)
        lower := strings.ToLower(name)
        if strings.HasSuffix(lower, ".mcpack") {
            rc, er := f.Open()
            if er != nil {
                return "ERR_OPEN_ZIP"
            }
            b, _ := io.ReadAll(rc)
            _ = rc.Close()
            base := strings.TrimSuffix(filepath.Base(name), filepath.Ext(name))
            err2 := ImportMcpackToDirs2(b, base, resDir, bpDir, skinDir, overwrite)
            if err2 != "" {
                return err2
            }
            imported = true
        }
    }

    type packInfo struct {
        dir      string
        manifest bedrockManifest
    }
    packs := []packInfo{}
    for _, f := range zr.File {
        nameInZip := strings.TrimPrefix(f.Name, "./")
        if strings.HasSuffix(nameInZip, "/") {
            continue
        }
        if strings.EqualFold(filepath.Base(nameInZip), "manifest.json") {
            dir := filepath.Dir(nameInZip)
            if dir == "." || strings.TrimSpace(dir) == "" {
                continue
            }
            rc, er := f.Open()
            if er != nil {
                continue
            }
            b, _ := io.ReadAll(rc)
            _ = rc.Close()
            var mf bedrockManifest
            _ = json.Unmarshal(b, &mf)
            packs = append(packs, packInfo{dir: dir, manifest: mf})
        }
    }
    for _, p := range packs {
        baseName := utils.SanitizeFilename(filepath.Base(p.dir))
        if strings.TrimSpace(baseName) == "" || baseName == "." || baseName == string(os.PathSeparator) {
            baseName = "pack"
        }
        targets := make([]string, 0, 3)
        hasAny := false
        for _, m := range p.manifest.Modules {
            tp := strings.ToLower(strings.TrimSpace(m.Type))
            if tp == "resources" && strings.TrimSpace(resDir) != "" {
                targets = append(targets, filepath.Join(resDir, baseName))
                hasAny = true
            } else if tp == "data" && strings.TrimSpace(bpDir) != "" {
                targets = append(targets, filepath.Join(bpDir, baseName))
                hasAny = true
            } else if tp == "skin_pack" && strings.TrimSpace(skinDir) != "" {
                targets = append(targets, filepath.Join(skinDir, baseName))
                hasAny = true
            }
        }
        if !hasAny {
            continue
        }
        for _, targetRoot := range targets {
            if utils.DirExists(targetRoot) {
                if overwrite {
                    if err := utils.RemoveDir(targetRoot); err != nil {
                        return "ERR_WRITE_FILE"
                    }
                } else {
                    return "ERR_DUPLICATE_FOLDER"
                }
            }
            for _, f := range zr.File {
                nameInZip := strings.TrimPrefix(f.Name, "./")
                var relInDir string
                if nameInZip != p.dir && !strings.HasPrefix(nameInZip, p.dir+"/") {
                    continue
                }
                relInDir = strings.TrimPrefix(strings.TrimPrefix(nameInZip, p.dir), "/")
                target := targetRoot
                if relInDir != "" && relInDir != "/" {
                    target = filepath.Join(targetRoot, relInDir)
                }
                safeTarget, _ := filepath.Abs(target)
                safeRoot, _ := filepath.Abs(targetRoot)
                if !strings.HasPrefix(strings.ToLower(safeTarget), strings.ToLower(safeRoot+string(os.PathSeparator))) && strings.ToLower(safeTarget) != strings.ToLower(safeRoot) {
                    continue
                }
                if f.FileInfo().IsDir() || strings.HasSuffix(f.Name, "/") {
                    if err := os.MkdirAll(target, 0755); err != nil {
                        return "ERR_CREATE_TARGET_DIR"
                    }
                    continue
                }
                if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
                    return "ERR_CREATE_TARGET_DIR"
                }
                rc, err := f.Open()
                if err != nil {
                    return "ERR_READ_ZIP_ENTRY"
                }
                out, er := os.Create(target)
                if er != nil {
                    rc.Close()
                    return "ERR_WRITE_FILE"
                }
                if _, er = io.Copy(out, rc); er != nil {
                    out.Close()
                    rc.Close()
                    return "ERR_WRITE_FILE"
                }
                out.Close()
                rc.Close()
            }
        }
        imported = true
    }
    if !imported {
        return "ERR_INVALID_PACKAGE"
    }
    return ""
}

func ImportMcaddonToDirs(data []byte, resDir string, bpDir string, overwrite bool) string {
	if len(data) == 0 {
		return "ERR_OPEN_ZIP"
	}
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "ERR_OPEN_ZIP"
	}
	imported := false
	for _, f := range zr.File {
		name := strings.TrimSpace(f.Name)
		lower := strings.ToLower(name)
		if strings.HasSuffix(lower, ".mcpack") {
			rc, er := f.Open()
			if er != nil {
				return "ERR_OPEN_ZIP"
			}
			b, _ := io.ReadAll(rc)
			_ = rc.Close()
			base := strings.TrimSuffix(filepath.Base(name), filepath.Ext(name))
			err2 := ImportMcpackToDirs(b, base, resDir, bpDir, overwrite)
			if err2 != "" {
				return err2
			}
			imported = true
		}
	}

	type packInfo struct {
		dir      string
		manifest bedrockManifest
	}
	packs := []packInfo{}
	for _, f := range zr.File {
		nameInZip := strings.TrimPrefix(f.Name, "./")
		if strings.HasSuffix(nameInZip, "/") {
			continue
		}
		if strings.EqualFold(filepath.Base(nameInZip), "manifest.json") {
			dir := filepath.Dir(nameInZip)
			if dir == "." || strings.TrimSpace(dir) == "" {
				continue
			}
			rc, er := f.Open()
			if er != nil {
				continue
			}
			b, _ := io.ReadAll(rc)
			_ = rc.Close()
			var mf bedrockManifest
			_ = json.Unmarshal(b, &mf)
			packs = append(packs, packInfo{dir: dir, manifest: mf})
		}
	}
	for _, p := range packs {
		baseName := utils.SanitizeFilename(filepath.Base(p.dir))
		if strings.TrimSpace(baseName) == "" || baseName == "." || baseName == string(os.PathSeparator) {
			baseName = "pack"
		}
		targets := make([]string, 0, 2)
		hasRes := false
		hasData := false
		for _, m := range p.manifest.Modules {
			tp := strings.ToLower(strings.TrimSpace(m.Type))
			if tp == "resources" && strings.TrimSpace(resDir) != "" {
				targets = append(targets, filepath.Join(resDir, baseName))
				hasRes = true
			} else if tp == "data" && strings.TrimSpace(bpDir) != "" {
				targets = append(targets, filepath.Join(bpDir, baseName))
				hasData = true
			}
		}
		if !hasRes && !hasData {
			continue
		}
		for _, targetRoot := range targets {
			if utils.DirExists(targetRoot) {
				if overwrite {
					if err := utils.RemoveDir(targetRoot); err != nil {
						return "ERR_WRITE_FILE"
					}
				} else {
					return "ERR_DUPLICATE_FOLDER"
				}
			}
			for _, f := range zr.File {
				nameInZip := strings.TrimPrefix(f.Name, "./")
				var relInDir string
				if nameInZip != p.dir && !strings.HasPrefix(nameInZip, p.dir+"/") {
					continue
				}
				relInDir = strings.TrimPrefix(strings.TrimPrefix(nameInZip, p.dir), "/")
				target := targetRoot
				if relInDir != "" && relInDir != "/" {
					target = filepath.Join(targetRoot, relInDir)
				}
				safeTarget, _ := filepath.Abs(target)
				safeRoot, _ := filepath.Abs(targetRoot)
				if !strings.HasPrefix(strings.ToLower(safeTarget), strings.ToLower(safeRoot+string(os.PathSeparator))) && strings.ToLower(safeTarget) != strings.ToLower(safeRoot) {
					continue
				}
				if f.FileInfo().IsDir() || strings.HasSuffix(f.Name, "/") {
					if err := os.MkdirAll(target, 0755); err != nil {
						return "ERR_CREATE_TARGET_DIR"
					}
					continue
				}
				if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
					return "ERR_CREATE_TARGET_DIR"
				}
				rc, err := f.Open()
				if err != nil {
					return "ERR_READ_ZIP_ENTRY"
				}
				out, er := os.Create(target)
				if er != nil {
					rc.Close()
					return "ERR_WRITE_FILE"
				}
				if _, er = io.Copy(out, rc); er != nil {
					out.Close()
					rc.Close()
					return "ERR_WRITE_FILE"
				}
				out.Close()
				rc.Close()
			}
		}
		imported = true
	}
	if !imported {
		return "ERR_INVALID_PACKAGE"
	}
	return ""
}

func ImportMcworldToDir(data []byte, archiveName string, worldsDir string, overwrite bool) string {
	if len(data) == 0 || strings.TrimSpace(worldsDir) == "" {
		return "ERR_OPEN_ZIP"
	}
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "ERR_OPEN_ZIP"
	}
	levelDir := ""
	for _, f := range zr.File {
		nameInZip := strings.TrimPrefix(f.Name, "./")
		if strings.HasSuffix(nameInZip, "/") {
			continue
		}
		if strings.EqualFold(filepath.Base(nameInZip), "level.dat") {
			d := filepath.Dir(nameInZip)
			if d != "." && strings.TrimSpace(d) != "" {
				levelDir = d
			}
			break
		}
	}
	baseName := strings.TrimSpace(archiveName)
	if baseName != "" {
		baseName = strings.TrimSuffix(filepath.Base(baseName), filepath.Ext(baseName))
	}
	baseName = utils.SanitizeFilename(baseName)
	if strings.TrimSpace(baseName) == "" || baseName == "." || baseName == string(os.PathSeparator) {
		baseName = "world"
	}
	targetRoot := filepath.Join(worldsDir, utils.SanitizeFilename(baseName))
	if utils.DirExists(targetRoot) {
		if overwrite {
			if err := utils.RemoveDir(targetRoot); err != nil {
				return "ERR_WRITE_FILE"
			}
		} else {
			return "ERR_DUPLICATE_FOLDER"
		}
	}
	for _, f := range zr.File {
		nameInZip := strings.TrimPrefix(f.Name, "./")
		var relInDir string
		if levelDir != "" {
			if nameInZip != levelDir && !strings.HasPrefix(nameInZip, levelDir+"/") {
				continue
			}
			relInDir = strings.TrimPrefix(strings.TrimPrefix(nameInZip, levelDir), "/")
		} else {
			relInDir = nameInZip
		}
		target := targetRoot
		if relInDir != "" && relInDir != "/" {
			target = filepath.Join(targetRoot, relInDir)
		}
		safeTarget, _ := filepath.Abs(target)
		safeRoot, _ := filepath.Abs(targetRoot)
		if !strings.HasPrefix(strings.ToLower(safeTarget), strings.ToLower(safeRoot+string(os.PathSeparator))) && strings.ToLower(safeTarget) != strings.ToLower(safeRoot) {
			continue
		}
		if f.FileInfo().IsDir() || strings.HasSuffix(f.Name, "/") {
			if err := os.MkdirAll(target, 0755); err != nil {
				return "ERR_CREATE_TARGET_DIR"
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
			return "ERR_CREATE_TARGET_DIR"
		}
		rc, err := f.Open()
		if err != nil {
			return "ERR_READ_ZIP_ENTRY"
		}
		out, er := os.Create(target)
		if er != nil {
			rc.Close()
			return "ERR_WRITE_FILE"
		}
		if _, er = io.Copy(out, rc); er != nil {
			out.Close()
			rc.Close()
			return "ERR_WRITE_FILE"
		}
		out.Close()
		rc.Close()
	}
	return ""
}

func ReadPackInfoFromDir(dir string) types.PackInfo {
    var info types.PackInfo
    d := strings.TrimSpace(dir)
    if d == "" {
        return info
    }
    target := findManifestDir(d)
    if strings.TrimSpace(target) == "" {
        target = d
    }
    manifestPath := filepath.Join(target, "manifest.json")
    if utils.FileExists(manifestPath) {
        if b, err := os.ReadFile(manifestPath); err == nil {
            var mf bedrockManifest
            _ = json.Unmarshal(b, &mf)
            info.Name = strings.TrimSpace(mf.Header.Name)
            info.Description = strings.TrimSpace(mf.Header.Description)
            if len(mf.Header.Version) > 0 {
				var vb strings.Builder
				for i, n := range mf.Header.Version {
					if i > 0 {
						vb.WriteRune('.')
					}
					vb.WriteString(fmt.Sprintf("%d", n))
				}
				info.Version = vb.String()
			}
			if len(mf.Header.MinEngineVersion) > 0 {
				var vb2 strings.Builder
				for i, n := range mf.Header.MinEngineVersion {
					if i > 0 {
						vb2.WriteRune('.')
					}
					vb2.WriteString(fmt.Sprintf("%d", n))
				}
				info.MinEngineVersion = vb2.String()
			}
		}
	}
    iconPath := filepath.Join(target, "pack_icon.png")
    if utils.FileExists(iconPath) {
        if b, err := os.ReadFile(iconPath); err == nil {
            enc := base64.StdEncoding.EncodeToString(b)
            info.IconDataUrl = "data:image/png;base64," + enc
        }
    }
    info.Path = target
    return info
}
