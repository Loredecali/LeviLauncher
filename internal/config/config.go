package config

import (
    "encoding/json"
    "os"
    "path/filepath"
    "strings"
)

type AppConfig struct {
    BaseRoot string `json:"base_root"`
}

func localAppData() string {
    if v := os.Getenv("LOCALAPPDATA"); strings.TrimSpace(v) != "" {
        return v
    }
    if v, _ := os.UserCacheDir(); strings.TrimSpace(v) != "" {
        return v
    }
    return "."
}

func configPath() string {
    base := filepath.Join(localAppData(), "LeviLauncher")
    _ = os.MkdirAll(base, 0o755)
    return filepath.Join(base, "config.json")
}

func Load() (AppConfig, error) {
    var c AppConfig
    p := configPath()
    b, err := os.ReadFile(p)
    if err != nil {
        return c, nil
    }
    _ = json.Unmarshal(b, &c)
    return c, nil
}

func Save(c AppConfig) error {
    p := configPath()
    b, err := json.MarshalIndent(c, "", "  ")
    if err != nil {
        return err
    }
    return os.WriteFile(p, b, 0o644)
}

func GetBaseRootOverride() string {
    c, _ := Load()
    return strings.TrimSpace(c.BaseRoot)
}
