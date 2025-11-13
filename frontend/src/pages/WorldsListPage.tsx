import React from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Spinner,
  Tooltip,
} from "@heroui/react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  GetContentRoots,
  OpenPathDir,
} from "../../bindings/github.com/liteldev/LeviLauncher/minecraft";
import * as types from "../../bindings/github.com/liteldev/LeviLauncher/internal/types/models";
import { readCurrentVersionName } from "../utils/currentVersion";
import { listPlayers } from "../utils/content";
import { listDirectories } from "../utils/fs";
import * as minecraft from "../../bindings/github.com/liteldev/LeviLauncher/minecraft";

export default function WorldsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hasBackend = minecraft !== undefined;
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>("");
  const [currentVersionName, setCurrentVersionName] =
    React.useState<string>("");
  const [roots, setRoots] = React.useState<types.ContentRoots>({
    base: "",
    usersRoot: "",
    resourcePacks: "",
    behaviorPacks: "",
    isIsolation: false,
    isPreview: false,
  });
  const [players, setPlayers] = React.useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = React.useState<string>("");
  type WorldItem = {
    name: string;
    path: string;
    levelName?: string;
    iconDataUrl?: string;
  };
  const [worldEntries, setWorldEntries] = React.useState<WorldItem[]>([]);
  const [backingUp, setBackingUp] = React.useState<string>("");
  const [backupDest, setBackupDest] = React.useState<string>("");

  const loadWorlds = async (player: string, r: types.ContentRoots) => {
    if (!hasBackend || !r?.usersRoot || !player) {
      setWorldEntries([]);
      return;
    }
    const wp = `${r.usersRoot}\\${player}\\games\\com.mojang\\minecraftWorlds`;
    try {
      const dirs = await listDirectories(wp);
      // fetch levelname and icon for each world directory via backend
      const enriched = await Promise.all(
        dirs.map(async (d) => {
          let levelName = "";
          let iconDataUrl = "";
          try {
            if (
              minecraft &&
              typeof minecraft.GetWorldLevelName === "function"
            ) {
              levelName = await minecraft.GetWorldLevelName(d.path);
            }
            if (
              minecraft &&
              typeof minecraft.GetWorldIconDataUrl === "function"
            ) {
              iconDataUrl = await minecraft.GetWorldIconDataUrl(d.path);
            }
          } catch {}
          return { ...d, levelName, iconDataUrl } as WorldItem;
        })
      );
      setWorldEntries(enriched);
    } catch {
      setWorldEntries([]);
    }
  };

  const refreshAll = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const name = readCurrentVersionName();
    setCurrentVersionName(name);
    try {
      if (!hasBackend || !name) {
        setRoots({
          base: "",
          usersRoot: "",
          resourcePacks: "",
          behaviorPacks: "",
          isIsolation: false,
          isPreview: false,
        });
        setPlayers([]);
        setSelectedPlayer("");
        setWorldEntries([]);
      } else {
        const r = await GetContentRoots(name);
        const safe = r || {
          base: "",
          usersRoot: "",
          resourcePacks: "",
          behaviorPacks: "",
          isIsolation: false,
          isPreview: false,
        };
        setRoots(safe);
        const names = await listPlayers(safe.usersRoot);
        setPlayers(names);
        const nextPlayer = names[0] || "";
        setSelectedPlayer(nextPlayer);
        await loadWorlds(nextPlayer, safe);
      }
    } catch (e) {
      setError(
        t("contentpage.error_resolve_paths", {
          defaultValue: "无法解析内容路径。",
        }) as string
      );
    } finally {
      setLoading(false);
    }
  }, [hasBackend, t]);

  React.useEffect(() => {
    refreshAll();
  }, []);

  const onChangePlayer = async (player: string) => {
    setSelectedPlayer(player);
    await loadWorlds(player, roots);
  };

  return (
    <div className="w-full h-full p-3 sm:p-4 lg:p-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl border border-default-200 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md p-5"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {t("contentpage.worlds", { defaultValue: "世界" })}
          </h1>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="bordered"
              onPress={() => navigate("/content")}
            >
              {t("common.back", { defaultValue: "返回" })}
            </Button>
            <Tooltip
              content={
                t("common.refresh", {
                  defaultValue: "刷新",
                }) as unknown as string
              }
            >
              <Button
                size="sm"
                variant="bordered"
                onPress={refreshAll}
                isDisabled={loading}
              >
                {t("common.refresh", { defaultValue: "刷新" })}
              </Button>
            </Tooltip>
          </div>
        </div>
        <div className="mt-2 text-default-500 text-sm">
          {t("contentpage.current_version", { defaultValue: "当前版本" })}:{" "}
          <span className="font-medium">
            {currentVersionName ||
              t("contentpage.none", { defaultValue: "无" })}
          </span>
          <span className="mx-2">·</span>
          {t("contentpage.isolation", { defaultValue: "版本隔离" })}:{" "}
          <span className="font-medium">
            {roots.isIsolation
              ? t("common.yes", { defaultValue: "是" })
              : t("common.no", { defaultValue: "否" })}
          </span>
        </div>

        <Card className="rounded-2xl mt-4">
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dropdown>
                <DropdownTrigger>
                  <Button
                    size="sm"
                    variant="flat"
                    className="rounded-full"
                    isDisabled={!players.length}
                  >
                    {selectedPlayer ||
                      t("contentpage.select_player", {
                        defaultValue: "选择玩家",
                      })}
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label={
                    t("contentpage.players_aria", {
                      defaultValue: "Players",
                    }) as unknown as string
                  }
                  selectionMode="single"
                  selectedKeys={new Set([selectedPlayer])}
                  onSelectionChange={(keys) => {
                    const arr = Array.from(keys as unknown as Set<string>);
                    const next = arr[0] || "";
                    if (typeof next === "string") onChangePlayer(next);
                  }}
                >
                  {players.length ? (
                    players.map((p) => (
                      <DropdownItem key={p} textValue={p}>
                        {p}
                      </DropdownItem>
                    ))
                  ) : (
                    <DropdownItem key="none" isDisabled>
                      {t("contentpage.no_players", {
                        defaultValue: "暂无玩家",
                      })}
                    </DropdownItem>
                  )}
                </DropdownMenu>
              </Dropdown>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="bordered"
                onPress={async () => {
                  if (!hasBackend || !roots.usersRoot || !selectedPlayer)
                    return;
                  const wp = `${roots.usersRoot}\\${selectedPlayer}\\games\\com.mojang\\minecraftWorlds`;
                  await OpenPathDir(wp);
                }}
                isDisabled={!roots.usersRoot || !selectedPlayer || !hasBackend}
              >
                {t("common.open", { defaultValue: "打开" })}
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />{" "}
                <span className="text-default-500">
                  {t("common.loading", { defaultValue: "加载中" })}
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {backupDest ? (
                  <div className="text-success text-sm">
                    {t("contentpage.backup_success", {
                      defaultValue: "备份成功",
                    })}
                    : <span className="underline break-all">{backupDest}</span>
                  </div>
                ) : null}
                {worldEntries.length ? (
                  worldEntries.map((w) => (
                    <div
                      key={w.path}
                      className="flex items-center justify-between rounded-xl px-3 py-2 bg-default-100/50"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {w.iconDataUrl ? (
                          <img
                            src={w.iconDataUrl}
                            alt={w.levelName || w.name}
                            className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-default-200 flex-shrink-0" />
                        )}
                        <div className="truncate">
                          <div className="font-medium truncate">
                            {w.levelName || w.name}
                          </div>
                          <div className="text-xs text-default-500 truncate">
                            {w.name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={() => OpenPathDir(w.path)}
                          isDisabled={!hasBackend}
                        >
                          {t("common.open", { defaultValue: "打开" })}
                        </Button>
                        <Button
                          size="sm"
                          color="primary"
                          variant="flat"
                          isLoading={backingUp === w.path}
                          isDisabled={!hasBackend}
                          onPress={async () => {
                            if (!minecraft) return;
                            setBackupDest("");
                            setBackingUp(w.path);
                            try {
                              let dest = "";
                              if (
                                typeof minecraft.BackupWorldWithVersion ===
                                "function"
                              ) {
                                dest = await minecraft.BackupWorldWithVersion(
                                  w.path,
                                  currentVersionName
                                );
                              } else if (
                                typeof minecraft.BackupWorld === "function"
                              ) {
                                dest = await minecraft.BackupWorld(w.path);
                              }
                              if (dest) setBackupDest(dest);
                            } catch {}
                            setBackingUp("");
                          }}
                        >
                          {t("contentpage.backup", { defaultValue: "备份" })}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-default-500">
                    {t("contentpage.no_worlds", { defaultValue: "暂无世界" })}
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}
