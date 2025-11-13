package types

type VersionJson struct {
	Name        string `json:"name"`
	Uuid        string `json:"uuid"`
	Version     string `json:"version"`
	IsPreview   bool   `json:"isPreview"`
	IsPreLoader bool   `json:"isPreLoader"`
}

type MinecraftVersion struct {
	Version   string `json:"version"`
	Uuid      string `json:"uuid"`
	Type      int    `json:"type"`
	SupportPL bool   `json:"supportPL"`
}

type LocalVersion struct {
	Name        string `json:"name"`
	Uuid        string `json:"uuid"`
	Path        string `json:"path"`
	Version     string `json:"version"`
	IsLaunched  bool   `json:"isLaunched"`
	IsPreview   bool   `json:"isPreview"`
	IsPreLoader bool   `json:"isPreLoader"`
}

type PreloaderJson struct {
	ColorLog bool   `json:"colorLog"`
	LogLevel int    `json:"logLevel"`
	LogPath  string `json:"logPath"`
	ModsPath string `json:"modsPath"`
	Version  int    `json:"version"`
}

type ModManifestJson struct {
    Name    string `json:"name"`
    Entry   string `json:"entry"`
    Version string `json:"version"`
    Type    string `json:"type"`
    Author  string `json:"author,omitempty"`
}

type ModInfo struct {
    Name    string `json:"name"`
    Entry   string `json:"entry"`
    Version string `json:"version"`
    Type    string `json:"type"`
    Author  string `json:"author,omitempty"`
}

type LanguageJson struct {
	Code     string `json:"code"`
	Language string `json:"language"`
}

type CheckUpdate struct {
    IsUpdate bool   `json:"isUpdate"`
    Version  string `json:"version"`
    Body     string `json:"body"`
}

type FileEntry struct {
	Name  string `json:"name"`
	Path  string `json:"path"`
	IsDir bool   `json:"isDir"`
	Size  int64  `json:"size"`
}

type MirrorTestResult struct {
	URL       string `json:"url"`
	LatencyMs int64  `json:"latencyMs"`
	Ok        bool   `json:"ok"`
	Status    int    `json:"status"`
	Error     string `json:"error,omitempty"`
}

// ContentRoots provides resolved base directories for managing game content.
// When version isolation is enabled, these paths point inside the selected version folder.
// Otherwise, they point to the installed GDK content directory.
type ContentRoots struct {
	// The base directory that contains the `Users` folder.
	Base string `json:"base"`
	// Path to the `Users` directory where player folders are stored.
	UsersRoot string `json:"usersRoot"`
	// Shared resource packs directory: `<Base>/Users/Shared/games/com.mojang/resource_packs`.
	ResourcePacks string `json:"resourcePacks"`
	// Shared behavior packs directory: `<Base>/Users/Shared/games/com.mojang/behavior_packs`.
	BehaviorPacks string `json:"behaviorPacks"`
	// Whether current version uses isolation (paths under versions/<name>/...).
	IsIsolation bool `json:"isIsolation"`
	// Whether current version is preview.
	IsPreview bool `json:"isPreview"`
}
