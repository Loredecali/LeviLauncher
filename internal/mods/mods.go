package mods

import (
    "archive/zip"
    "bytes"
    "encoding/json"
    "io"
    "os"
    "path/filepath"
    "strings"

    "github.com/liteldev/LeviLauncher/internal/types"
    "github.com/liteldev/LeviLauncher/internal/utils"
)

func GetMods(mcname string) (result []types.ModInfo) {
    // Mods live under versions/<name>/mods
    name := strings.TrimSpace(mcname)
    if name == "" {
        return result
    }
    vroot, err := utils.GetVersionsDir()
    if err != nil || strings.TrimSpace(vroot) == "" {
        return result
    }
    root := filepath.Join(vroot, name)
    modsDir := filepath.Join(root, "mods")
    if !utils.DirExists(modsDir) {
        _ = os.MkdirAll(modsDir, 0755)
    }
    modDirs := utils.GetDirNames(modsDir)
    for _, modDir := range modDirs {
        jsonfile := filepath.Join(modsDir, modDir, "manifest.json")
        if utils.FileExists(jsonfile) {
            var ManifestJson types.ModManifestJson
            data, err := os.ReadFile(jsonfile)
            if err != nil {
                continue
            }
            if err = json.Unmarshal(data, &ManifestJson); err != nil {
                continue
            }
            var modinfo types.ModInfo
            modinfo.Name = ManifestJson.Name
            modinfo.Entry = ManifestJson.Entry
            modinfo.Version = ManifestJson.Version
            modinfo.Type = ManifestJson.Type
            modinfo.Author = ManifestJson.Author
            result = append(result, modinfo)
        }
    }
    return result
}

// DeleteMod removes the specified mod folder under versions/<name>/mods.
// Returns empty string on success, or an error code string on failure.
func DeleteMod(mcname string, modFolder string) string {
    name := strings.TrimSpace(mcname)
    mod := strings.TrimSpace(modFolder)
    if name == "" || mod == "" {
        return "ERR_INVALID_NAME"
    }
    vroot, err := utils.GetVersionsDir()
    if err != nil || strings.TrimSpace(vroot) == "" {
        return "ERR_ACCESS_VERSIONS_DIR"
    }
    root := filepath.Join(vroot, name)
    modsDir := filepath.Join(root, "mods")
    target := filepath.Join(modsDir, mod)
    // safety: ensure target is inside modsDir
    absTarget, _ := filepath.Abs(target)
    absMods, _ := filepath.Abs(modsDir)
    lowT := strings.ToLower(absTarget)
    lowM := strings.ToLower(absMods)
    if lowT != lowM && !strings.HasPrefix(lowT, lowM+string(os.PathSeparator)) {
        return "ERR_INVALID_PACKAGE"
    }
    if !utils.DirExists(target) {
        return "ERR_INVALID_PACKAGE"
    }
    if err := os.RemoveAll(target); err != nil {
        return "ERR_WRITE_FILE"
    }
    return ""
}

// ImportZipToMods extracts a zip blob into versions/<name>/mods preserving folder structure.
// Returns empty string on success, or an error code string on failure.
func ImportZipToMods(mcname string, data []byte, overwrite bool) string {
    name := strings.TrimSpace(mcname)
    if name == "" {
        return "ERR_INVALID_NAME"
    }
    vroot, err := utils.GetVersionsDir()
    if err != nil || strings.TrimSpace(vroot) == "" {
        return "ERR_ACCESS_VERSIONS_DIR"
    }
    root := filepath.Join(vroot, name)
    modsDir := filepath.Join(root, "mods")
    if !utils.DirExists(modsDir) {
        if er := os.MkdirAll(modsDir, 0755); er != nil {
            return "ERR_CREATE_TARGET_DIR"
        }
    }
    zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
    if err != nil {
        return "ERR_OPEN_ZIP"
    }
    manifestDir := ""
    manifestName := ""
    var manifestJson types.ModManifestJson
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
                _ = json.Unmarshal(b, &manifestJson)
                manifestName = strings.TrimSpace(manifestJson.Name)
            }
            if dir != "." && strings.TrimSpace(dir) != "" {
                manifestDir = dir
            }
            break
        }
    }
    if manifestDir == "" && manifestName == "" {
        return "ERR_MANIFEST_NOT_FOUND"
    }
    modFolderName := ""
    if manifestDir != "" {
        modFolderName = filepath.Base(manifestDir)
    } else {
        modFolderName = manifestName
    }
    if strings.TrimSpace(modFolderName) == "" || modFolderName == "." || modFolderName == string(os.PathSeparator) {
        return "ERR_INVALID_PACKAGE"
    }
    targetRoot := filepath.Join(modsDir, modFolderName)
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
    return ""
}

// ImportDllToMods imports a single DLL into versions/<name>/mods by creating a folder
// named after the provided modName (or the DLL base name if empty), generating a manifest.json
// with entry set to "dll", and copying the DLL into the folder.
// Returns empty string on success, or an error code string on failure.
func ImportDllToMods(mcname string, dllFileName string, data []byte, modName string, modType string, version string, overwrite bool) string {
    name := strings.TrimSpace(mcname)
    if name == "" {
        return "ERR_INVALID_NAME"
    }
    vroot, err := utils.GetVersionsDir()
    if err != nil || strings.TrimSpace(vroot) == "" {
        return "ERR_ACCESS_VERSIONS_DIR"
    }
    root := filepath.Join(vroot, name)
    modsDir := filepath.Join(root, "mods")
    if !utils.DirExists(modsDir) {
        if er := os.MkdirAll(modsDir, 0755); er != nil {
            return "ERR_CREATE_TARGET_DIR"
        }
    }
    base := strings.TrimSuffix(filepath.Base(strings.TrimSpace(dllFileName)), filepath.Ext(dllFileName))
    finalName := strings.TrimSpace(modName)
    if finalName == "" {
        finalName = base
    }
    if finalName == "" {
        return "ERR_INVALID_NAME"
    }
    if strings.TrimSpace(modType) == "" {
        modType = "preload-native"
    }
    if strings.TrimSpace(version) == "" {
        version = "0.0.0"
    }
    targetRoot := filepath.Join(modsDir, finalName)
    if utils.DirExists(targetRoot) {
        if overwrite {
            if err := utils.RemoveDir(targetRoot); err != nil {
                return "ERR_WRITE_FILE"
            }
        } else {
            return "ERR_DUPLICATE_FOLDER"
        }
    }
    if err := os.MkdirAll(targetRoot, 0755); err != nil {
        return "ERR_CREATE_TARGET_DIR"
    }
    manifest := types.ModManifestJson{ Name: finalName, Entry: filepath.Base(dllFileName), Version: version, Type: modType }
    mbytes, _ := json.MarshalIndent(manifest, "", "  ")
    if err := os.WriteFile(filepath.Join(targetRoot, "manifest.json"), mbytes, 0644); err != nil {
        return "ERR_WRITE_FILE"
    }
    dllTarget := filepath.Join(targetRoot, filepath.Base(dllFileName))
    if err := os.WriteFile(dllTarget, data, 0644); err != nil {
        return "ERR_WRITE_FILE"
    }
    return ""
}
