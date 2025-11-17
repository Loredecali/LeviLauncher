import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Chip } from "@heroui/react";
import { FaGithub, FaUsers, FaHeart, FaCode, FaPatreon, FaStar } from "react-icons/fa";
import { Browser } from "@wailsio/runtime";
import { motion } from "framer-motion";

export default function AboutPage() {
  const { t } = useTranslation();

  const repoUrl = "https://github.com/LiteLDev/LeviLauncher";
  const orgUrl = "https://github.com/LiteLDev";

  return (
    <motion.div
      className="relative w-full h-full p-3 sm:p-4 lg:p-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.section
            className="rounded-2xl border border-default-200 bg-white/60 dark:bg-black/30 backdrop-blur-md shadow-sm p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
          <div className="flex items-center gap-2 mb-2">
            <FaUsers className="text-default-600" />
            <h2 className="text-base font-semibold">
              {t("about.authors", { defaultValue: "作者与维护者" })}
            </h2>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="https://avatars.githubusercontent.com/u/62042544?v=4"
                alt="DreamGuXiang Avatar"
                className="w-14 h-14 rounded-full border border-default-300 shadow-sm"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-default-900 font-semibold">DreamGuXiang</span>
                  <Chip size="sm" variant="flat" color="primary">
                    {t("about.author", { defaultValue: "作者" })}
                  </Chip>
                </div>
                <div className="text-small text-default-600">
                  {t("about.ll_authors", { defaultValue: "LeviLauncher作者" })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="flat"
                startContent={<FaHeart />}
                onPress={() => Browser.OpenURL("https://afdian.com/a/DreamGuXiang")}
              >
                {t("about.afdian", { defaultValue: "Afdian" })}
              </Button>
              <Button
                size="sm"
                variant="flat"
                startContent={<FaPatreon />}
                onPress={() => Browser.OpenURL("https://www.patreon.com/c/DreamGuXiang")}
              >
                {t("about.patreon", { defaultValue: "Patreon" })}
              </Button>
            </div>
          </div>
        </motion.section>

          <motion.section
            className="rounded-2xl border border-default-200 bg-white/60 dark:bg-black/30 backdrop-blur-md shadow-sm p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <FaStar className="text-warning-500" />
              <h2 className="text-base font-semibold">
                {t("about.thanks", { defaultValue: "特别鸣谢" })}
              </h2>
            </div>
          <p className="text-default-700 leading-7">
              {t("about.thanks.desc", {
                defaultValue: "特别感谢为 LeviLauncher 提供帮助与支持的个人与项目。",
              })}
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="https://www.rhymc.com/assets/img/logo.png"
                alt={t("about.rhymc_name", { defaultValue: "旋律云" })}
                className="h-10 rounded-md object-contain"
              />
            </div>
            <Button
              size="sm"
              variant="light"
              onPress={() => Browser.OpenURL("https://www.rhymc.com/")}
            >
              {t("about.website", { defaultValue: "官网" })}
            </Button>
          </div>
        </motion.section>

          <motion.section
            className="rounded-2xl border border-default-200 bg-white/60 dark:bg-black/30 backdrop-blur-md shadow-sm p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <FaHeart className="text-danger-500" />
              <h2 className="text-base font-semibold">
                {t("about.sponsors", { defaultValue: "支持者（赞助者）" })}
              </h2>
            </div>
            <p className="text-default-700 leading-7">
              {t("about.sponsors.desc", {
                defaultValue: "感谢所有为项目发展提供帮助的赞助者与支持者！",
              })}
            </p>
          </motion.section>

          <motion.section
            className="rounded-2xl border border-default-200 bg-white/60 dark:bg-black/30 backdrop-blur-md shadow-sm p-4 lg:col-span-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <FaCode className="text-default-600" />
              <h2 className="text-base font-semibold">
                {t("about.source", { defaultValue: "源代码与开源" })}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-default-300 px-3 py-2 hover:bg-default-100/60"
                onClick={(e) => { e.preventDefault(); Browser.OpenURL(repoUrl); }}
              >
                <FaGithub />
                <span>{t("about.github_repo", { defaultValue: "GitHub · LeviLauncher" })}</span>
              </a>
              <a
                href={orgUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-default-300 px-3 py-2 hover:bg-default-100/60"
                onClick={(e) => { e.preventDefault(); Browser.OpenURL(orgUrl); }}
              >
                <FaGithub />
                <span>{t("about.github_org", { defaultValue: "LiteLDev 组织" })}</span>
              </a>
            </div>
            <p className="mt-3 text-default-700 leading-7">
              {t("about.license.tip", {
                defaultValue: "许可证与详细信息请参见仓库中的 LICENSE 文件。",
              })}
            </p>
          </motion.section>

          <motion.section
            className="rounded-2xl border border-default-200 bg-white/60 dark:bg-black/30 backdrop-blur-md shadow-sm p-4 lg:col-span-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <FaGithub className="text-default-600" />
              <h2 className="text-base font-semibold">
                {t("about.contribute", { defaultValue: "参与贡献" })}
              </h2>
            </div>
            <p className="text-default-700 leading-7">
              {t("about.contribute.desc", {
                defaultValue:
                  "欢迎通过提交 Issue 或 Pull Request 的方式参与贡献，共同完善 LeviLauncher。",
              })}
            </p>
            <div className="flex gap-2 mt-2">
              <Button
                variant="flat"
                startContent={<FaGithub />}
                onPress={() => Browser.OpenURL(`${repoUrl}/issues`)}
              >
                {t("about.issue", { defaultValue: "Issue" })}
              </Button>
              <Button
                color="primary"
                startContent={<FaGithub />}
                onPress={() => Browser.OpenURL(`${repoUrl}`)}
              >
                {t("about.star_fork", { defaultValue: "Star / Fork" })}
              </Button>
            </div>
          </motion.section>
        </div>
    </motion.div>
  );
}
