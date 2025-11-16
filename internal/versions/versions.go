package versions

import (
	"regexp"
	"strings"
)

func ValidateFolderName(name string) string {
	n := strings.TrimSpace(name)
	if n == "" {
		return "ERR_NAME_REQUIRED"
	}
	if len(n) > 64 {
		return "ERR_NAME_TOO_LONG"
	}
	if strings.HasSuffix(n, ".") || strings.HasSuffix(n, " ") {
		return "ERR_NAME_TRAILING_DOT_SPACE"
	}
	invalidRe := regexp.MustCompile(`[<>:"/\\|?*]`)
	if invalidRe.MatchString(n) {
		return "ERR_NAME_INVALID_CHAR"
	}
	for _, r := range n {
		if r < 32 {
			return "ERR_NAME_CONTROL_CHAR"
		}
	}
	return ""
}


func NormalizeName(name string) string {
	t := strings.TrimSpace(name)
	l := strings.ToLower(t)
	if strings.HasPrefix(l, "preview ") {
		return strings.TrimSpace(t[8:])
	}
	if strings.HasPrefix(l, "release ") {
		return strings.TrimSpace(t[8:])
	}
	return t
}

func EqualsIgnoreType(downloadedBase, shortVersion string) bool {
	return strings.EqualFold(NormalizeName(downloadedBase), strings.TrimSpace(shortVersion))
}
