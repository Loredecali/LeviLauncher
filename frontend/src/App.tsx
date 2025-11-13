import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import {
  Button,
  Tooltip,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { IoCloseOutline } from "react-icons/io5";
import { FiMinimize2 } from "react-icons/fi";
import { LeviIcon } from "./icons/LeviIcon";
import { FaDownload, FaRocket, FaCog, FaList, FaEllipsisH } from "react-icons/fa";
import { LauncherPage } from "./pages/LauncherPage";
import { DownloadPage } from "./pages/DownloadPage";
import { SplashScreen } from "./pages/SplashScreen";
import { motion, AnimatePresence } from "framer-motion";
import { Events, Window } from "@wailsio/runtime";
import { SettingsPage } from "./pages/SettingsPage";
import { VersionSelectPage } from "./pages/VersionSelectPage";
import VersionSettingsPage from "./pages/VersionSettingsPage";
import ModsPage from "./pages/ModsPage";
import FileManagerPage from "./pages/FileManagerPage";
import ContentPage from "./pages/ContentPage";
import WorldsListPage from "./pages/WorldsListPage";
import ResourcePacksPage from "./pages/ResourcePacksPage";
import BehaviorPacksPage from "./pages/BehaviorPacksPage";
import { useTranslation } from "react-i18next";
import { VersionStatusProvider } from "./utils/VersionStatusContext";
import InstallPage from "./pages/InstallPage";
import * as minecraft from "../bindings/github.com/liteldev/LeviLauncher/minecraft";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function App() {
  // Splash visibility + reveal orchestration for smoother transition
  const [splashVisible, setSplashVisible] = useState(true);
  const [revealStarted, setRevealStarted] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(false);
  const [count, setCount] = useState(0);
  const { t, i18n } = useTranslation();
  const hasBackend = minecraft !== undefined;
  const [isBeta, setIsBeta] = useState(false);
  const [navLocked, setNavLocked] = useState<boolean>(false);
  const [termsOpen, setTermsOpen] = useState<boolean>(false);
  const [termsCountdown, setTermsCountdown] = useState<number>(0);
  const [updateOpen, setUpdateOpen] = useState<boolean>(false);
  const [updateVersion, setUpdateVersion] = useState<string>("");
  const [updateBody, setUpdateBody] = useState<string>("");
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);

  // language selection moved into Settings modal

  const refresh = () => {
    setCount((prevCount) => {
      return prevCount + 1;
    });
  };

  const setIsFirstLoadFalse = () => {
    setIsFirstLoad((isFirstLoad) => {
      return (isFirstLoad = false);
    });
  };

  useEffect(() => {
    // Let splash show briefly, then fade overlay out.
    // Only reveal header after overlay fade completes to avoid visual overlap.
    const splashDurationMs = 1400;
    const overlayFadeMs = 600; // matches AnimatePresence exit duration

    setIsFirstLoad(false);

    const tHide = setTimeout(() => setSplashVisible(false), splashDurationMs);
    const tHeader = setTimeout(
      () => setRevealStarted(true),
      splashDurationMs + overlayFadeMs
    );
    return () => {
      clearTimeout(tHide);
      clearTimeout(tHeader);
    };
  }, []);

  // Listen for nav lock changes triggered by InstallPage
  useEffect(() => {
    try {
      setNavLocked(Boolean((window as any).llNavLock));
    } catch {}
    const handler = (e: any) => {
      try {
        setNavLocked(Boolean(e?.detail?.lock ?? (window as any).llNavLock));
      } catch {}
    };
    window.addEventListener("ll-nav-lock-changed", handler as any);
    return () =>
      window.removeEventListener("ll-nav-lock-changed", handler as any);
  }, []);

  // First-launch Terms modal gating (after splash & header reveal)
  useEffect(() => {
    try {
      const accepted = localStorage.getItem("ll.termsAccepted");
      if (!accepted && revealStarted) {
        setTermsOpen(true);
        setNavLocked(true);
      }
    } catch {}
  }, [revealStarted]);

  // Terms modal: start 10s countdown when opened to prevent instant accept
  useEffect(() => {
    if (!termsOpen) return;
    setTermsCountdown(10);
    const iv = setInterval(() => {
      setTermsCountdown((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(iv);
  }, [termsOpen]);

  // Startup update check (after splash & terms)
  useEffect(() => {
    if (!hasBackend) return;
    if (!revealStarted) return;
    if (termsOpen) return;
    try {
      const ignored = localStorage.getItem("ll.ignoreVersion") || "";
      minecraft?.CheckUpdate?.()
        .then((res: any) => {
          const ver = String(res?.version || "");
          const body = String(res?.body || "");
          const is = Boolean(res?.isUpdate);
          if (is && ver && ver !== ignored) {
            setUpdateVersion(ver);
            setUpdateBody(body);
            setUpdateOpen(true);
            setNavLocked(true);
          }
        })
        .catch(() => {});
    } catch {}
  }, [hasBackend, revealStarted, termsOpen]);

  // Lock background scroll when update modal is open
  useEffect(() => {
    try {
      if (updateOpen) {
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
        const root = document.getElementById("root");
        if (root) (root as HTMLElement).style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
        const root = document.getElementById("root");
        if (root) (root as HTMLElement).style.overflow = "";
      }
    } catch {}
    return () => {
      try {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
        const root = document.getElementById("root");
        if (root) (root as HTMLElement).style.overflow = "";
      } catch {}
    };
  }, [updateOpen]);

  const acceptTerms = () => {
    try {
      localStorage.setItem("ll.termsAccepted", "1");
    } catch {}
    setTermsOpen(false);
    setNavLocked(Boolean((window as any).llNavLock));
  };

  useEffect(() => {
    if (!hasBackend) return;
    try {
      minecraft
        ?.GetIsBeta?.()
        .then((v: boolean) => setIsBeta(!!v))
        .catch(() => {});
    } catch {}
  }, [hasBackend]);

  const location = useLocation();
  const navigate = useNavigate();

  // 全局兜底：注册 msixvc 下载事件监听，防止后端提示“无监听器”
  useEffect(() => {
    if (!hasBackend) return;

    const off1 = Events.On("msixvc_download_progress", () => {});
    const off2 = Events.On("msixvc_download_status", () => {});
    const off3 = Events.On("msixvc_download_error", () => {});
    const off4 = Events.On("msixvc_download_done", () => {});
    return () => {
      try {
        off1 && off1();
      } catch {}
      try {
        off2 && off2();
      } catch {}
      try {
        off3 && off3();
      } catch {}
      try {
        off4 && off4();
      } catch {}
    };
  }, [hasBackend]);

  // Global: prevent browser default on file drag/drop anywhere in the app
  useEffect(() => {
    const isFileDrag = (e: DragEvent) => {
      try {
        const types = e?.dataTransfer?.types;
        if (!types) return false;
        return Array.from(types).includes("Files");
      } catch {
        return false;
      }
    };
    const onDocDragOverCapture = (e: DragEvent) => {
      if (isFileDrag(e)) {
        e.preventDefault();
        try {
          (e.dataTransfer as any).dropEffect = "copy";
        } catch {}
      }
    };
    const onDocDropCapture = (e: DragEvent) => {
      if (isFileDrag(e)) {
        e.preventDefault();
      }
    };
    document.addEventListener("dragover", onDocDragOverCapture, true);
    document.addEventListener("drop", onDocDropCapture, true);
    return () => {
      document.removeEventListener("dragover", onDocDragOverCapture, true);
      document.removeEventListener("drop", onDocDropCapture, true);
    };
  }, []);

  return (
    <VersionStatusProvider>
      {/* Splash overlay with animated exit */}
      <AnimatePresence>
        {splashVisible && (
          <motion.div
            key="splash-overlay"
            className="fixed inset-0 z-[9999]"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <SplashScreen />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`w-full min-h-[100dvh] flex flex-col overflow-x-hidden ${updateOpen ? "overflow-y-hidden" : ""}`}>
        <motion.div
          id="wails-draggable"
          className="fixed top-0 left-0 right-0 z-50 px-4 py-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{
            opacity: revealStarted ? 1 : 0,
            y: revealStarted ? 0 : -10,
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="flex items-center w-full rounded-2xl border border-default-200 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md shadow-sm px-2 py-1 sm:px-3 sm:py-2">
            <div className="flex items-center gap-2 shrink-0">
              <LeviIcon
                width={24}
                height={24}
                className="rounded-md shadow-sm"
              />
              <p className="font-bold text-[16px] sm:text-[18px] tracking-tight brand-text-gradient bg-clip-text text-transparent animate-text-gradient animate-fadeInMove">
                LeviLauncher
              </p>
              {isBeta && (
                <Chip
                  size="sm"
                  color="warning"
                  variant="flat"
                  className="uppercase font-semibold"
                >
                  Beta
                </Chip>
              )}
            </div>
            <div className="flex-1 flex items-center gap-2 justify-center whitespace-nowrap overflow-x-auto px-1">
              <Tooltip
                content={t("launcherpage.launch_button")}
                delay={0}
                closeDelay={0}
              >
                <Button
                  variant="light"
                  aria-label="Start"
                  isDisabled={navLocked}
                  onPress={() => {
                    if (navLocked) return;
                    navigate("/");
                  }}
                  className={`px-3 rounded-2xl ${
                    location.pathname === "/" ? "bg-default-200" : ""
                  }`}
                  startContent={<FaRocket size={18} />}
                >
                  {t("launcherpage.launch_button")}
                </Button>
              </Tooltip>
              
              <Tooltip
                content={t("downloadmodal.download_button")}
                delay={0}
                closeDelay={0}
              >
                <Button
                  variant="light"
                  aria-label="Download Page"
                  isDisabled={navLocked}
                  onPress={() => {
                    if (navLocked) return;
                    navigate("/download");
                  }}
                  className={`px-3 rounded-2xl ${
                    location.pathname === "/download" ? "bg-default-200" : ""
                  }`}
                  startContent={<FaDownload size={18} />}
                >
                  {t("downloadmodal.download_button")}
                </Button>
              </Tooltip>
              <Tooltip content={t("app.settings")} delay={0} closeDelay={0}>
                <Button
                  variant="light"
                  aria-label="Settings Page"
                  isDisabled={navLocked}
                  onPress={() => {
                    if (navLocked) return;
                    navigate("/settings");
                  }}
                  className={`px-3 rounded-2xl ${
                    location.pathname === "/settings" ? "bg-default-200" : ""
                  }`}
                  startContent={<FaCog size={18} />}
                >
                  {t("app.settings")}
                </Button>
              </Tooltip>
              <Tooltip
                content={t("nav.more", { defaultValue: "更多" })}
                delay={0}
                closeDelay={0}
              >
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      variant="light"
                      aria-label="More Menu"
                      isDisabled={navLocked}
                      className={`px-3 rounded-2xl ${
                        location.pathname === "/versions" ? "bg-default-200" : ""
                      }`}
                      startContent={<FaEllipsisH size={18} />}
                    >
                      {t("nav.more", { defaultValue: "更多" })}
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="more-menu"
                    onAction={(key) => {
                      if (navLocked) return;
                      const k = String(key);
                      if (k === "versions") navigate("/versions");
                    }}
                  >
                    <DropdownItem key="versions" startContent={<FaList size={14} />}>
                      {t("nav.versions", { defaultValue: "版本" })}
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-auto justify-end">
              <div className="flex items-center gap-1 rounded-xl bg-default-100/50 px-2 py-1">
                <ThemeSwitcher />
              </div>
              <div className="h-6 w-px bg-default-300 mx-1" />
              <Button
                isIconOnly
                variant="light"
                aria-label="Minimize"
                isDisabled={navLocked}
                onClick={() => {
                  if (navLocked) return;
                  Window.Minimise();
                }}
              >
                <FiMinimize2 size={24} />
              </Button>
              <Button
                isIconOnly
                variant="light"
                aria-label="Close"
                isDisabled={navLocked}
                onClick={() => {
                  if (navLocked) return;
                  Window.Close();
                }}
              >
                <IoCloseOutline size={28} />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* spacer to offset fixed top bar height */}
        <div className="h-[68px]" />

        <motion.div
          className="w-full flex-1 min-h-0 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: revealStarted ? 1 : 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ pointerEvents: revealStarted ? "auto" : "none" }}
        >
          {revealStarted &&
            (isFirstLoad ? (
              <></>
            ) : (
              <Routes>
                <Route
                  path="/"
                  element={<LauncherPage refresh={refresh} count={count} />}
                />
                <Route path="/download" element={<DownloadPage />} />
                <Route path="/install" element={<InstallPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route
                  path="/versions"
                  element={<VersionSelectPage refresh={refresh} />}
                />
                <Route
                  path="/version-settings"
                  element={<VersionSettingsPage />}
                />
                <Route path="/mods" element={<ModsPage />} />
                <Route path="/filemanager" element={<FileManagerPage />} />
                <Route path="/content" element={<ContentPage />} />
                <Route path="/content/worlds" element={<WorldsListPage />} />
                <Route
                  path="/content/resource-packs"
                  element={<ResourcePacksPage />}
                />
                <Route
                  path="/content/behavior-packs"
                  element={<BehaviorPacksPage />}
                />
              </Routes>
            ))}
        </motion.div>

        {/* First-launch Terms Modal (priority over other modals) */}
        <Modal
          size="lg"
          isOpen={termsOpen}
          hideCloseButton
          isDismissable={false}
        >
          <ModalContent>
            {() => (
              <>
                <ModalHeader className="text-primary-700 text-[18px] sm:text-[20px] font-bold antialiased">
                  {t("terms.title", { defaultValue: "用户协议" })}
                </ModalHeader>
                <ModalBody>
                  <div className="text-[15px] sm:text-[16px] leading-7 text-default-900 font-medium antialiased whitespace-pre-wrap break-words max-h-[56vh] overflow-y-auto pr-1">
                    {t("terms.body", {
                      defaultValue:
                        "在使用本启动器之前，请仔细阅读并同意《用户协议》和相关条款。继续使用即表示您已同意。",
                    })}
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button
                    variant="light"
                    onPress={() => {
                      Window.Close();
                    }}
                  >
                    {t("terms.decline", { defaultValue: "不同意，退出" })}
                  </Button>
                  <Button
                    color="primary"
                    isDisabled={termsCountdown > 0}
                    onPress={acceptTerms}
                  >
                    {termsCountdown > 0
                      ? `${t("terms.agree", {
                          defaultValue: "同意并继续",
                        })} (${termsCountdown}s)`
                      : t("terms.agree", { defaultValue: "同意并继续" })}
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Update Modal */}
        <Modal size="md" isOpen={updateOpen} hideCloseButton>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex items-center gap-2 text-primary-600">
                  <FaRocket className="w-5 h-5" />
                  <span>
                    {t("settingscard.body.version.hasnew", {
                      defaultValue: "有新的版本更新！",
                    })}
                     {updateVersion}
                  </span>
                </ModalHeader>
                <ModalBody>
                  {updateBody ? (
                    <div className="rounded-md bg-default-100/60 border border-default-200 px-3 py-2">
                      <div className="text-small font-semibold mb-1">
                        {t("downloadpage.changelog.title", {
                          defaultValue: "最新更新日志",
                        })}
                      </div>
                      <div className="text-small break-words leading-6 max-h-[32vh] sm:max-h-[40vh] lg:max-h-[44vh] overflow-y-auto pr-1">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => (
                              <h1 className="text-xl font-semibold mt-2 mb-2">{children}</h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-lg font-semibold mt-2 mb-2">{children}</h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-base font-semibold mt-2 mb-2">{children}</h3>
                            ),
                            p: ({ children }) => <p className="my-1">{children}</p>,
                            ul: ({ children }) => (
                              <ul className="list-disc pl-6 my-2">{children}</ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal pl-6 my-2">{children}</ol>
                            ),
                            li: ({ children }) => <li className="my-1">{children}</li>,
                            a: ({ href, children }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary underline"
                              >
                                {children}
                              </a>
                            ),
                            hr: () => <hr className="my-3 border-default-200" />,
                          }}
                        >
                          {updateBody}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : null}
                </ModalBody>
                <ModalFooter>
                  <Button
                    variant="light"
                    onPress={() => {
                      setUpdateOpen(false);
                      setNavLocked(Boolean((window as any).llNavLock));
                      onClose();
                    }}
                  >
                    {t("common.cancel", { defaultValue: "取消" })}
                  </Button>
                  <Button
                    variant="flat"
                    onPress={() => {
                      try {
                        localStorage.setItem("ll.ignoreVersion", updateVersion || "");
                      } catch {}
                      setUpdateOpen(false);
                      setNavLocked(Boolean((window as any).llNavLock));
                      onClose();
                    }}
                  >
                    {t("settingscard.body.version.ignore", { defaultValue: "屏蔽该版本" })}
                  </Button>
                  <Button
                    color="primary"
                    isLoading={updateLoading}
                    onPress={async () => {
                      setUpdateLoading(true);
                      try {
                        await minecraft?.Update?.();
                      } finally {
                        setUpdateLoading(false);
                      }
                    }}
                  >
                    {t("settingscard.modal.2.footer.download_button", { defaultValue: "更新" })}
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    </VersionStatusProvider>
  );
}

export default App;
