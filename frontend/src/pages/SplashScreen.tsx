import React from "react";
import { LeviIcon } from "../icons/LeviIcon";
import { useTranslation } from "react-i18next";

export const SplashScreen = () => {
  const { t } = useTranslation();
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute -top-36 -left-36 h-[28rem] w-[28rem] rounded-full bg-gradient-to-tr from-emerald-500/18 to-lime-400/18 blur-3xl animate-splash-bg" />
        <div className="absolute -bottom-36 -right-36 h-[30rem] w-[30rem] rounded-full bg-gradient-to-tr from-cyan-500/18 to-indigo-400/18 blur-3xl animate-splash-bg" />
      </div>

      <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-4">
        <div className="relative h-[180px] w-[180px]">
          <div className="absolute inset-0 rounded-full border border-white/30 dark:border-white/10 opacity-50" />
          <div className="absolute inset-0 splash-orbit">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[10px] w-[10px] rounded-full bg-emerald-400 shadow-md" />
          </div>
          <div className="absolute inset-0 splash-ring-glow" />
          <div className="relative flex h-full w-full items-center justify-center splash-logo-float">
            <LeviIcon
              width={140}
              height={140}
              className="rounded-xl shadow-xl"
            />
          </div>
        </div>

        <h1 className="font-extrabold text-5xl tracking-tight brand-text-gradient bg-clip-text text-transparent animate-text-gradient splash-title">
          LeviLauncher
        </h1>

        <div className="w-[260px] max-w-[70vw]">
          <div className="relative h-2 rounded-full bg-default-100/70 dark:bg-default-50/10 overflow-hidden border border-white/30">
            <div className="absolute top-0 bottom-0 rounded-full bg-default-400/60 indeterminate-bar1" />
            <div className="absolute top-0 bottom-0 rounded-full bg-default-400/40 indeterminate-bar2" />
          </div>
        </div>

        <p className="text-default-500 text-sm">
          {t("splash.preparing", { defaultValue: "正在准备启动..." })}
        </p>
      </div>
    </div>
  );
};
