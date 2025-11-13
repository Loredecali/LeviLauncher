import React from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Tooltip,
  Modal,
  useDisclosure,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  GetContentRoots,
  ListDir,
  OpenPathDir,
} from "../../bindings/github.com/liteldev/LeviLauncher/minecraft";
import * as types from "../../bindings/github.com/liteldev/LeviLauncher/internal/types/models";
import { readCurrentVersionName } from "../utils/currentVersion";
import { listDirectories } from "../utils/fs";
import * as minecraft from "../../bindings/github.com/liteldev/LeviLauncher/minecraft";

export default function BehaviorPacksPage() {
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
  const [entries, setEntries] = React.useState<
    { name: string; path: string }[]
  >([]);
  const { isOpen, onOpen } = useDisclosure();

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
        setEntries([]);
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
        const dirs = await listDirectories(safe.behaviorPacks);
        setEntries(dirs);
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
  React.useEffect(() => {
    onOpen();
  }, [onOpen]);

  return (
    <div className="w-full h-full p-3 sm:p-4 lg:p-6">
      <Modal isOpen={isOpen} hideCloseButton isDismissable={false}>
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="text-warning-600">
                {t("contentpage.not_ready_title", {
                  defaultValue: "页面未完成",
                })}
              </ModalHeader>
              <ModalBody>
                <p className="text-default-700">
                  {t("contentpage.not_ready_body", {
                    defaultValue:
                      "该页面尚在开发中，暂不提供访问。请返回主页。",
                  })}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onPress={() => navigate("/")}>
                  {t("common.back", { defaultValue: "返回" })}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl border border-default-200 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md p-5"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {t("contentpage.behavior_packs", { defaultValue: "行为包" })}
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
            <div className="text-default-500 text-sm">
              {roots.behaviorPacks ||
                t("contentpage.path_unknown", { defaultValue: "路径未知" })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="bordered"
                onPress={() => OpenPathDir(roots.behaviorPacks)}
                isDisabled={!hasBackend || !roots.behaviorPacks}
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
                {entries.length ? (
                  entries.map((e) => (
                    <div
                      key={e.path}
                      className="flex items-center justify-between rounded-xl px-3 py-2 bg-default-100/50"
                    >
                      <div className="truncate">
                        <span className="font-medium">{e.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={() => OpenPathDir(e.path)}
                          isDisabled={!hasBackend}
                        >
                          {t("common.open", { defaultValue: "打开" })}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-default-500">
                    {t("contentpage.no_behavior_packs", {
                      defaultValue: "暂无行为包",
                    })}
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
