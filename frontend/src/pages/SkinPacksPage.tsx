import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Chip, Image, Spinner, Tooltip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { GetContentRoots, ListDir, OpenPathDir } from "../../bindings/github.com/liteldev/LeviLauncher/minecraft";
import * as types from "../../bindings/github.com/liteldev/LeviLauncher/internal/types/models";
import { readCurrentVersionName } from "../utils/currentVersion";
import { listDirectories } from "../utils/fs";
import { listPlayers } from "../utils/content";
import * as minecraft from "../../bindings/github.com/liteldev/LeviLauncher/minecraft";
import { renderMcText } from "../utils/mcformat";

export default function SkinPacksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hasBackend = minecraft !== undefined;
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>("");
  const [currentVersionName, setCurrentVersionName] = React.useState<string>("");
  const [roots, setRoots] = React.useState<types.ContentRoots>({ base: "", usersRoot: "", resourcePacks: "", behaviorPacks: "", isIsolation: false, isPreview: false });
  const [players, setPlayers] = React.useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = React.useState<string>("");
  const [packs, setPacks] = React.useState<any[]>([]);
  const [resultSuccess, setResultSuccess] = React.useState<string[]>([]);
  const [resultFailed, setResultFailed] = React.useState<Array<{ name: string; err: string }>>([]);
  const [activePack, setActivePack] = React.useState<any | null>(null);
  const { isOpen: delOpen, onOpen: delOnOpen, onOpenChange: delOnOpenChange } = useDisclosure();
  const { isOpen: delCfmOpen, onOpen: delCfmOnOpen, onOpenChange: delCfmOnOpenChange } = useDisclosure();

  const loadSkinPacks = async (player: string, r: types.ContentRoots) => {
    if (!hasBackend || !r?.usersRoot || !player) {
      setPacks([]);
      return;
    }
    const sp = `${r.usersRoot}\\${player}\\games\\com.mojang\\skin_packs`;
    try {
      const dirs = await listDirectories(sp);
      const infos = await Promise.all(
        dirs.map(async (d) => {
          try {
            const info = await (minecraft as any)?.GetPackInfo?.(d.path);
            return { ...info, path: d.path };
          } catch {
            return { name: d.name, description: "", version: "", minEngineVersion: "", iconDataUrl: "", path: d.path };
          }
        })
      );
      setPacks(infos);
    } catch {
      setPacks([]);
    }
  };

  const refreshAll = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const name = readCurrentVersionName();
    setCurrentVersionName(name);
    try {
      if (!hasBackend || !name) {
        setRoots({ base: "", usersRoot: "", resourcePacks: "", behaviorPacks: "", isIsolation: false, isPreview: false });
        setPlayers([]);
        setSelectedPlayer("");
        setPacks([]);
      } else {
        const r = await GetContentRoots(name);
        const safe = r || { base: "", usersRoot: "", resourcePacks: "", behaviorPacks: "", isIsolation: false, isPreview: false };
        setRoots(safe);
        const names = await listPlayers(safe.usersRoot);
        setPlayers(names);
        const nextPlayer = names[0] || "";
        setSelectedPlayer(nextPlayer);
        await loadSkinPacks(nextPlayer, safe);
      }
    } catch (e) {
      setError(t("contentpage.error_resolve_paths", { defaultValue: "无法解析内容路径。" }) as string);
    } finally {
      setLoading(false);
    }
  }, [hasBackend, t]);

  React.useEffect(() => { refreshAll(); }, []);

  const onChangePlayer = async (player: string) => {
    setSelectedPlayer(player);
    await loadSkinPacks(player, roots);
  };

  return (
    <div className="w-full h-full p-3 sm:p-4 lg:p-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="rounded-2xl border border-default-200 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md p-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("contentpage.skin_packs", { defaultValue: "皮肤包" })}</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="bordered" onPress={() => navigate("/content")}>{t("common.back", { defaultValue: "返回" })}</Button>
            <Tooltip content={t("common.refresh", { defaultValue: "刷新" }) as unknown as string}>
              <Button size="sm" variant="bordered" onPress={refreshAll} isDisabled={loading}>{t("common.refresh", { defaultValue: "刷新" })}</Button>
            </Tooltip>
          </div>
        </div>
        <div className="mt-2 text-default-500 text-sm">
          {t("contentpage.current_version", { defaultValue: "当前版本" })}: <span className="font-medium">{currentVersionName || t("contentpage.none", { defaultValue: "无" })}</span>
          <span className="mx-2">·</span>
          {t("contentpage.isolation", { defaultValue: "版本隔离" })}: <span className="font-medium">{roots.isIsolation ? t("common.yes", { defaultValue: "是" }) : t("common.no", { defaultValue: "否" })}</span>
        </div>

        <div className="rounded-xl border border-default-200 bg-white/50 dark:bg-neutral-800/40 shadow-sm backdrop-blur-sm px-3 py-2 mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dropdown>
              <DropdownTrigger>
                <Button size="sm" variant="flat" className="rounded-full" isDisabled={!players.length}>
                  {selectedPlayer || t("contentpage.select_player", { defaultValue: "选择玩家" })}
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label={t("contentpage.players_aria", { defaultValue: "Players" }) as unknown as string} selectionMode="single" selectedKeys={new Set([selectedPlayer])} onSelectionChange={(keys) => {
                const arr = Array.from(keys as unknown as Set<string>);
                const next = arr[0] || "";
                if (typeof next === "string") onChangePlayer(next);
              }}>
                {players.length ? (
                  players.map((p) => (<DropdownItem key={p} textValue={p}>{p}</DropdownItem>))
                ) : (
                  <DropdownItem key="none" isDisabled>{t("contentpage.no_players", { defaultValue: "暂无玩家" })}</DropdownItem>
                )}
              </DropdownMenu>
            </Dropdown>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="bordered" onPress={async () => {
              if (!hasBackend || !roots.usersRoot || !selectedPlayer) return;
              const sp = `${roots.usersRoot}\\${selectedPlayer}\\games\\com.mojang\\skin_packs`;
              await OpenPathDir(sp);
            }} isDisabled={!roots.usersRoot || !selectedPlayer || !hasBackend}>{t("common.open", { defaultValue: "打开" })}</Button>
          </div>
        </div>

        <div className="mt-3">
          {loading ? (
            <div className="flex items-center gap-2"><Spinner size="sm" /> <span className="text-default-500">{t("common.loading", { defaultValue: "加载中" })}</span></div>
          ) : (
            <div className="flex flex-col gap-2">
              {packs.length ? (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  {packs.map((p, idx) => (
                    <div key={`${p.path}-${idx}`} className="relative rounded-xl border border-default-200 bg-white/70 dark:bg-neutral-800/50 p-3 hover:bg-white/80 dark:hover:bg-neutral-800/60 transition-colors h-36">
                      <div className="flex items-start h-full">
                        <div className="flex-1 min-w-0 flex flex-col pb-12 pr-3">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold truncate">{renderMcText(p.name || p.path.split("\\").pop())}</div>
                            {p.version ? <Chip size="sm" variant="flat" className="shrink-0">{p.version}</Chip> : null}
                          </div>
                          <div className="flex-1 min-h-0 overflow-hidden">
                            <div className="text-small text-default-600 mt-1 overflow-hidden text-ellipsis whitespace-nowrap">{renderMcText(p.description || "")}</div>
                            <div className="text-tiny text-default-500 mt-1 overflow-hidden text-ellipsis whitespace-nowrap">
                              {p.minEngineVersion ? `${t("contentpage.min_engine_version", { defaultValue: "最小游戏版本" })}: ${p.minEngineVersion}` : "\u00A0"}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="absolute right-3 bottom-3 flex items-center gap-2">
                        <Button size="sm" variant="flat" onPress={() => OpenPathDir(p.path)}>{t("common.open", { defaultValue: "打开" })}</Button>
                        <Button size="sm" color="danger" variant="flat" onPress={() => { setActivePack(p); delCfmOnOpen(); }}>{t("common.delete", { defaultValue: "删除" })}</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-default-500">{t("contentpage.no_skin_packs", { defaultValue: "暂无皮肤包" })}</div>
              )}
            </div>
          )}
        </div>

        <Modal size="sm" isOpen={delCfmOpen} onOpenChange={delCfmOnOpenChange} hideCloseButton>
          <ModalContent>
            {(onClose) => (<>
              <ModalHeader className="text-danger">{t("mods.confirm_delete_title", { defaultValue: "确认删除" })}</ModalHeader>
              <ModalBody>
                <div className="text-sm text-default-700 break-words whitespace-pre-wrap">{t("mods.confirm_delete_body", { defaultValue: "确定要删除此包吗？此操作不可撤销。" })}</div>
                {activePack ? (<div className="mt-1 rounded-md bg-default-100/60 border border-default-200 px-3 py-2 text-default-800 text-sm break-words whitespace-pre-wrap">{activePack.name || activePack.path}</div>) : null}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={() => { onClose(); }}>{t("common.cancel", { defaultValue: "取消" })}</Button>
                <Button color="danger" onPress={async () => {
                  if (!activePack) { onClose(); return; }
                  const err = await (minecraft as any)?.DeletePack?.(currentVersionName, activePack.path);
                  if (err) {
                    setResultSuccess([]);
                    setResultFailed([{ name: activePack.name || activePack.path, err }]);
                    delOnOpen();
                  } else {
                    await refreshAll();
                    setResultSuccess([activePack.name || activePack.path]);
                    setResultFailed([]);
                    delOnOpen();
                  }
                  onClose();
                }}>{t("common.confirm", { defaultValue: "确定" })}</Button>
              </ModalFooter>
            </>)}
          </ModalContent>
        </Modal>
        <Modal size="md" isOpen={delOpen} onOpenChange={delOnOpenChange} hideCloseButton>
          <ModalContent>
            {(onClose) => (<>
              <ModalHeader className={`flex items-center gap-2 ${resultFailed.length ? "text-red-600" : "text-primary-600"}`}>
                <span>{resultFailed.length ? t("mods.delete_summary_title_failed", { defaultValue: "删除失败" }) : t("mods.delete_summary_title_done", { defaultValue: "删除完成" })}</span>
              </ModalHeader>
              <ModalBody>
                {resultSuccess.length ? (
                  <div className="mb-2">
                    <div className="text-sm font-semibold text-success">{t("mods.summary_deleted", { defaultValue: "已删除" })} ({resultSuccess.length})</div>
                    <div className="mt-1 rounded-md bg-success/5 border border-success/30 px-3 py-2 text-success-700 text-sm break-words whitespace-pre-wrap">{resultSuccess.join("\n")}</div>
                  </div>
                ) : null}
                {resultFailed.length ? (
                  <div>
                    <div className="text-sm font-semibold text-danger">{t("mods.summary_failed", { defaultValue: "失败" })} ({resultFailed.length})</div>
                    <div className="mt-1 rounded-md bg-danger/5 border border-danger/30 px-3 py-2 text-danger-700 text-sm break-words whitespace-pre-wrap">{resultFailed.map((it) => `${it.name} - ${it.err}`).join("\n")}</div>
                  </div>
                ) : null}
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onPress={() => { setResultSuccess([]); setResultFailed([]); onClose(); }}>{t("common.confirm", { defaultValue: "确定" })}</Button>
              </ModalFooter>
            </>)}
          </ModalContent>
        </Modal>
      </motion.div>
    </div>
  );
}