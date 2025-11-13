import React from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Spinner,
  Tooltip,
} from "@heroui/react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { GetContentRoots } from "../../bindings/github.com/liteldev/LeviLauncher/minecraft";
import * as types from "../../bindings/github.com/liteldev/LeviLauncher/internal/types/models";
import { FaGlobe, FaImage, FaCogs } from "react-icons/fa";
import { readCurrentVersionName } from "../utils/currentVersion";
import { countDirectories } from "../utils/fs";
import { listPlayers } from "../utils/content";
import * as minecraft from "../../bindings/github.com/liteldev/LeviLauncher/minecraft";

export default function ContentPage() {
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
  const [worldsCount, setWorldsCount] = React.useState<number>(0);
  const [resCount, setResCount] = React.useState<number>(0);
  const [bpCount, setBpCount] = React.useState<number>(0);

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
        setWorldsCount(0);
        setResCount(0);
        setBpCount(0);
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
        if (safe.usersRoot) {
          const names = await listPlayers(safe.usersRoot);
          setPlayers(names);
          const nextPlayer = names[0] || "";
          setSelectedPlayer(nextPlayer);
          if (nextPlayer) {
            const wp = `${safe.usersRoot}\\${nextPlayer}\\games\\com.mojang\\minecraftWorlds`;
            setWorldsCount(await countDirectories(wp));
          } else {
            setWorldsCount(0);
          }
        } else {
          setPlayers([]);
          setSelectedPlayer("");
          setWorldsCount(0);
        }
        setResCount(await countDirectories(safe.resourcePacks));
        setBpCount(await countDirectories(safe.behaviorPacks));
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
    if (!hasBackend || !roots.usersRoot || !player) {
      setWorldsCount(0);
      return;
    }
    const wp = `${roots.usersRoot}\\${player}\\games\\com.mojang\\minecraftWorlds`;
    setWorldsCount(await countDirectories(wp));
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
            {t("launcherpage.content_manage", { defaultValue: "内容管理" })}
          </h1>
          <Tooltip
            content={
              t("common.refresh", { defaultValue: "刷新" }) as unknown as string
            }
          >
            <Button
              size="sm"
              variant="bordered"
              onPress={refreshAll}
              isDisabled={loading}
              className="rounded-full px-4"
            >
              {t("common.refresh", { defaultValue: "刷新" })}
            </Button>
          </Tooltip>
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
        {!!error && <div className="mt-2 text-danger-500 text-sm">{error}</div>}

        <div className="mt-4 rounded-xl border border-default-200 bg-white/50 dark:bg-neutral-800/40 shadow-sm backdrop-blur-sm px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-small text-default-600">
              {t("contentpage.select_player", { defaultValue: "选择玩家" })}
            </span>
            <span className="text-small text-default-700 font-medium">
              {selectedPlayer ||
                t("contentpage.no_players", { defaultValue: "暂无玩家" })}
            </span>
          </div>
          <Dropdown>
            <DropdownTrigger>
              <Button
                size="sm"
                variant="light"
                className="rounded-full"
                isDisabled={!players.length}
              >
                {selectedPlayer ||
                  t("contentpage.select_player", { defaultValue: "选择玩家" })}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Players"
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
                  {t("contentpage.no_players", { defaultValue: "暂无玩家" })}
                </DropdownItem>
              )}
            </DropdownMenu>
          </Dropdown>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div
            className="rounded-xl border border-default-200 bg-white/50 dark:bg-neutral-800/40 shadow-sm backdrop-blur-sm px-3 py-3 cursor-pointer transition hover:bg-white/70 dark:hover:bg-neutral-800/60"
            onClick={() => navigate("/content/worlds")}
            role="button"
            aria-label="worlds"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaGlobe className="text-default-500" />
                <span className="text-small text-default-600 truncate">
                  {t("contentpage.worlds", { defaultValue: "世界" })}
                </span>
              </div>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />{" "}
                  <span className="text-default-500">
                    {t("common.loading", { defaultValue: "加载中" })}
                  </span>
                </div>
              ) : (
                <span className="text-base font-semibold text-default-800">
                  {worldsCount}
                </span>
              )}
            </div>
          </div>
          <div
            className="rounded-xl border border-default-200 bg-white/50 dark:bg-neutral-800/40 shadow-sm backdrop-blur-sm px-3 py-3 cursor-pointer transition hover:bg-white/70 dark:hover:bg-neutral-800/60"
            onClick={() => navigate("/content/resource-packs")}
            role="button"
            aria-label="resource-packs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaImage className="text-default-500" />
                <span className="text-small text-default-600 truncate">
                  {t("contentpage.resource_packs", { defaultValue: "资源包" })}
                </span>
              </div>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />{" "}
                  <span className="text-default-500">
                    {t("common.loading", { defaultValue: "加载中" })}
                  </span>
                </div>
              ) : (
                <span className="text-base font-semibold text-default-800">
                  {resCount}
                </span>
              )}
            </div>
          </div>
          <div
            className="rounded-xl border border-default-200 bg-white/50 dark:bg-neutral-800/40 shadow-sm backdrop-blur-sm px-3 py-3 cursor-pointer transition hover:bg-white/70 dark:hover:bg-neutral-800/60"
            onClick={() => navigate("/content/behavior-packs")}
            role="button"
            aria-label="behavior-packs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaCogs className="text-default-500" />
                <span className="text-small text-default-600 truncate">
                  {t("contentpage.behavior_packs", { defaultValue: "行为包" })}
                </span>
              </div>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />{" "}
                  <span className="text-default-500">
                    {t("common.loading", { defaultValue: "加载中" })}
                  </span>
                </div>
              ) : (
                <span className="text-base font-semibold text-default-800">
                  {bpCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
