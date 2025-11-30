import { LeviIcon } from "../icons/LeviIcon";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

export const SplashScreen = () => {
  const { t } = useTranslation();

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background flex flex-col items-center justify-center">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-[20%] -left-[10%] h-[60vh] w-[60vh] rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 blur-[100px]"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-[40%] -right-[10%] h-[70vh] w-[70vh] rounded-full bg-gradient-to-bl from-indigo-500/20 to-purple-500/20 blur-[100px]"
          animate={{
            x: [0, -50, 0],
            y: [0, -40, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-[20%] left-[20%] h-[50vh] w-[50vh] rounded-full bg-gradient-to-t from-lime-400/20 to-emerald-400/20 blur-[100px]"
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="flex flex-col items-center justify-center gap-8 z-10 p-8">
        <div className="relative">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-20"
          >
            <div className="relative flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-200/30 to-white/80 dark:from-emerald-500/20 dark:to-white/5 backdrop-blur-2xl rounded-3xl border border-white/40 shadow-2xl ring-1 ring-white/30">
              <LeviIcon
                width={120}
                height={120}
                className="drop-shadow-2xl"
              />
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-center space-y-2"
        >
          <h1 className="font-extrabold text-5xl tracking-tight bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500 bg-clip-text text-transparent drop-shadow-sm">
            LeviLauncher
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="w-64 space-y-3"
        >
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-default-200/50 dark:bg-default-100/10">
            <motion.div
              className="absolute top-0 bottom-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full"
              initial={{ width: "0%", x: "-100%" }}
              animate={{ 
                width: ["30%", "70%", "30%"],
                x: ["-100%", "150%", "-100%"]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
          
          <p className="text-center text-sm text-default-500 font-medium animate-pulse">
            {t("splash.preparing", { defaultValue: "正在准备启动..." })}
          </p>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-8 text-xs text-default-400/60"
      >
        Designed for Minecraft Bedrock
      </motion.div>
    </div>
  );
};
