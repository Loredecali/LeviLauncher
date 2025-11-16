package registry

import (
	"encoding/json"
	"fmt"
	"log"
	"os/exec"
	"strings"
	"syscall"

	"golang.org/x/sys/windows/registry"
)

func GetMinecraftPackage(isPreview bool) (map[string]interface{}, error) {
	var packageName string
	if isPreview {
		packageName = "Microsoft.MinecraftWindowsBeta"
	} else {
		packageName = "Microsoft.MinecraftUWP"
	}

	info, err := GetAppxInfo(packageName)
	if err != nil {
		return nil, nil
	}
	return map[string]interface{}{
		"PackageID":         info.PackageFullName,
		"PackageRootFolder": info.InstallLocation,
		"Version":           info.Version,
	}, nil
}

func GetPackagePath(isPreview bool) (string, error) {
	data, err := GetMinecraftPackage(isPreview)
	if err != nil {
		return "", err
	}
	if data == nil {
		return "", fmt.Errorf("Minecraft package not found")
	}
	packageID, ok := data["PackageRootFolder"].(string)
	if !ok {
		return "", fmt.Errorf("PackageID not found or not a string")
	}
	return packageID, nil
}

type AppxInfo struct {
	PackageFullName   string `json:"PackageFullName"`
	PackageFamilyName string `json:"PackageFamilyName"`
	Version           string `json:"Version"`
	InstallLocation   string `json:"InstallLocation"`
}

func GetAppxInfo(packageName string) (*AppxInfo, error) {
	ps := "Get-AppxPackage -Name '" + packageName + "' | Select-Object PackageFullName, PackageFamilyName, Version, InstallLocation | ConvertTo-Json"
	cmd := exec.Command("powershell", "-Command", ps)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Println("GetAppxInfo error:", err, string(output))
		return nil, err
	}
	if len(output) == 0 {
		return nil, fmt.Errorf("empty result from Get-AppxPackage")
	}
	var info AppxInfo
	if err := json.Unmarshal(output, &info); err != nil {
		var arr []AppxInfo
		if err2 := json.Unmarshal(output, &arr); err2 == nil && len(arr) > 0 {
			info = arr[0]
		} else {
			log.Println("GetAppxInfo unmarshal error:", err)
			return nil, err
		}
	}
	if info.InstallLocation == "" || info.PackageFullName == "" {
		return nil, fmt.Errorf("package %s not found", packageName)
	}
	return &info, nil
}

func GetAUMID(isPreview bool) (string, error) {
	info, err := GetAppxInfo(getPackageName(isPreview))
	if err != nil {
		return "", err
	}
	if info.PackageFamilyName == "" {
		return "", fmt.Errorf("PackageFamilyName not found")
	}
	return info.PackageFamilyName + "!App", nil
}

func IsDevOnlyEnabled(isPreview bool) (bool, error) {
	info, err := GetAppxInfo(getPackageName(isPreview))
	if err != nil {
		return false, fmt.Errorf("failed to get package info: %v", err)
	}
	regPath := fmt.Sprintf("SOFTWARE\\Microsoft\\GamingServices\\GameConfig\\%s\\Executable\\00000000", info.PackageFullName)
	key, err := registry.OpenKey(registry.LOCAL_MACHINE, regPath, registry.READ)
	if err != nil {
		return false, nil
	}
	defer key.Close()
	v, _, err := key.GetIntegerValue("IsDevOnly")
	if err != nil {
		return false, nil
	}
	return v == 1, nil
}

func SetIsDevOnly(isPreview bool) error {
	info, err := GetAppxInfo(getPackageName(isPreview))
	if err != nil {
		return fmt.Errorf("failed to get package info: %v", err)
	}
	regPath := fmt.Sprintf("SOFTWARE\\Microsoft\\GamingServices\\GameConfig\\%s\\Executable\\00000000", info.PackageFullName)
	key, _, err := registry.CreateKey(registry.LOCAL_MACHINE, regPath, registry.WRITE)
	if err != nil {
		if isAccessDenied(err) {
			return runElevatedSetIsDevOnly(info.PackageFullName)
		}
		return fmt.Errorf("failed to create/open registry key: %v", err)
	}
	defer key.Close()
	if err := key.SetDWordValue("IsDevOnly", 1); err != nil {
		if isAccessDenied(err) {
			return runElevatedSetIsDevOnly(info.PackageFullName)
		}
		return fmt.Errorf("failed to set IsDevOnly value: %v", err)
	}
	log.Printf("Successfully set IsDevOnly=1 for package: %s", info.PackageFullName)
	return nil
}

func EnsureIsDevOnly(isPreview bool) error {
	enabled, err := IsDevOnlyEnabled(isPreview)
	if err != nil {
		return err
	}
	if enabled {
		return nil
	}
	if err := SetIsDevOnly(isPreview); err != nil {
		return err
	}
	return nil
}

func getPackageName(isPreview bool) string {
	if isPreview {
		return "Microsoft.MinecraftWindowsBeta"
	}
	return "Microsoft.MinecraftUWP"
}

func ClearAppModelStateChange(isPreview bool) error {
	info, err := GetAppxInfo(getPackageName(isPreview))
	if err != nil {
		return fmt.Errorf("failed to get package info: %v", err)
	}
	subPath := fmt.Sprintf("SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AppModel\\StateChange\\PackageList\\%s", info.PackageFullName)
	if err := registry.DeleteKey(registry.LOCAL_MACHINE, subPath); err != nil {
		if isAccessDenied(err) {
			return runElevatedRegDelete(fmt.Sprintf("HKLM\\%s", subPath))
		}
		low := strings.ToLower(err.Error())
		if strings.Contains(low, "file not found") || strings.Contains(low, "系统找不到指定的文件") {
			return nil
		}
		return fmt.Errorf("failed to delete StateChange key: %v", err)
	}
	return nil
}

func runElevatedRegDelete(fullPath string) error {
	arg := fmt.Sprintf("delete \"%s\" /f", fullPath)
	ps := fmt.Sprintf("Start-Process reg -ArgumentList '%s' -Verb RunAs -WindowStyle Hidden", arg)
	cmd := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command", ps)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("elevated reg delete failed: %v, output: %s", err, string(output))
	}
	return nil
}

func runElevatedSetIsDevOnly(packageFullName string) error {
	regPath := fmt.Sprintf("HKLM\\SOFTWARE\\Microsoft\\GamingServices\\GameConfig\\%s\\Executable\\00000000", packageFullName)
	arg := fmt.Sprintf("add \"%s\" /v IsDevOnly /t REG_DWORD /d 1 /f", regPath)
	ps := fmt.Sprintf("Start-Process reg -ArgumentList '%s' -Verb RunAs -WindowStyle Hidden", arg)
	cmd := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-Command", ps)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("elevated reg add failed: %v, output: %s", err, string(output))
	}
	return nil
}

func isAccessDenied(err error) bool {
	if errno, ok := err.(syscall.Errno); ok {
		if errno == 5 { 
			return true
		}
	}
	s := strings.ToLower(err.Error())
	return strings.Contains(s, "access is denied") || strings.Contains(s, "拒绝访问")
}
