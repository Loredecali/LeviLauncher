package utils

import (
    "archive/zip"
    "io"
    "os"
    "path/filepath"
    "strings"
)

func CreateDir(path string) error {
	return os.MkdirAll(path, 0755)
}

func RemoveDir(path string) error {
	return os.RemoveAll(path)
}

func DirExists(path string) bool {
    _, err := os.Stat(path)
    if err != nil {
        if os.IsNotExist(err) {
            return false
        }
    }
    return true
}

func GetDirNames(path string) []string {
    dir, err := os.Open(path)
    if err != nil {
        return nil
    }
    defer dir.Close()
    names, _ := dir.Readdirnames(-1)
    return names
}

func GetLastDirName(path string) string {
    return filepath.Base(path)
}

func GetAppDataPath() string {
    path := os.Getenv("APPDATA")
    return path
}

func GetMinecraftGDKDataPath(ispreview bool) string {
	if ispreview {
		return filepath.Join(GetAppDataPath(), "Minecraft Bedrock Preview")
	}
	return filepath.Join(GetAppDataPath(), "Minecraft Bedrock")
}

func FileExists(path string) bool {
    _, err := os.Stat(path)
    if err != nil {
        if os.IsNotExist(err) {
            return false
        }
    }
    return true
}

func ZipDir(srcDir, destZip string) error {
	out, err := os.Create(destZip)
	if err != nil {
		return err
	}
	defer out.Close()

	zw := zip.NewWriter(out)
	defer zw.Close()

	return filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(srcDir, path)
		if err != nil {
			return err
		}
		// Skip top-level root
		if rel == "." {
			return nil
		}
		// Normalize zip entry paths to forward slashes
		rel = filepath.ToSlash(rel)

		if info.IsDir() {
			// Explicit directory entries are optional; skip
			return nil
		}

		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}
		header.Name = rel
		header.Method = zip.Deflate

		writer, err := zw.CreateHeader(header)
		if err != nil {
			return err
		}
		f, err := os.Open(path)
		if err != nil {
			return err
		}
		defer f.Close()
		_, err = io.Copy(writer, f)
		return err
	})
}

// DirSize walks the directory recursively and returns the total size of regular files in bytes.
// Errors encountered during traversal are ignored to keep this utility resilient.
// Symlinks and non-regular files are skipped.
func DirSize(path string) int64 {
    var total int64
    root := filepath.Clean(strings.TrimSpace(path))
    if root == "" {
        return 0
    }
    _ = filepath.Walk(root, func(p string, info os.FileInfo, err error) error {
        if err != nil || info == nil {
            return nil
        }
        if info.Mode().IsRegular() {
            total += info.Size()
        }
        return nil
    })
    return total
}

// SanitizeFilename removes invalid characters for Windows file names and trims spaces.
// Returns a safe non-empty name; if the input results in empty, it falls back to "world".
func SanitizeFilename(name string) string {
	s := strings.TrimSpace(name)
	if s == "" {
		return "world"
	}
	// invalid characters for Windows filenames
	invalid := "<>:\"/\\|?*"
	var b strings.Builder
	for _, r := range s {
		if r < 32 || strings.ContainsRune(invalid, r) {
			b.WriteRune('_')
		} else {
			b.WriteRune(r)
		}
	}
	cleaned := strings.TrimRight(b.String(), " .")
	if cleaned == "" {
		return "world"
	}
	return cleaned
}

// CopyDir recursively copies all files and subdirectories from src to dst.
// Existing files will be overwritten. File permissions are preserved where possible.
func CopyDir(src, dst string) error {
    src = filepath.Clean(strings.TrimSpace(src))
    dst = filepath.Clean(strings.TrimSpace(dst))
    if src == "" || dst == "" {
        return os.ErrInvalid
    }
    info, err := os.Stat(src)
    if err != nil {
        return err
    }
    if !info.IsDir() {
        return os.ErrInvalid
    }
    if err := os.MkdirAll(dst, 0755); err != nil {
        return err
    }
    return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
        if err != nil {
            return err
        }
        rel, err := filepath.Rel(src, path)
        if err != nil {
            return err
        }
        // Skip root
        if rel == "." {
            return nil
        }
        // Normalize destination path
        target := filepath.Join(dst, rel)
        if info.IsDir() {
            return os.MkdirAll(target, 0755)
        }
        // Skip unsupported types (symlinks, devices)
        if !info.Mode().IsRegular() {
            return nil
        }
        // Ensure parent
        if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
            return err
        }
        in, err := os.Open(path)
        if err != nil {
            return err
        }
        defer in.Close()
        out, err := os.OpenFile(target, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, info.Mode())
        if err != nil {
            return err
        }
        defer out.Close()
        if _, err := io.Copy(out, in); err != nil {
            return err
        }
        return nil
    })
}
