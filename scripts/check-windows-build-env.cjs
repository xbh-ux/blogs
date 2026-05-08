const fs = require("fs");
const os = require("os");
const path = require("path");

const checkRoot = path.join(process.cwd(), ".tmp-next-build-check");
const targetDir = path.join(checkRoot, "target");
const linkPath = path.join(checkRoot, "link");
const linkType = process.platform === "win32" ? "junction" : "dir";

function cleanup() {
  fs.rmSync(checkRoot, { recursive: true, force: true });
}

cleanup();
fs.mkdirSync(targetDir, { recursive: true });

try {
  fs.symlinkSync(targetDir, linkPath, linkType);
  fs.readlinkSync(linkPath);
  cleanup();
} catch (error) {
  cleanup();

  const message =
    error && typeof error.message === "string" ? error.message : String(error);
  const code = error && typeof error.code === "string" ? error.code : "UNKNOWN";
  const runningInWsl =
    process.platform === "linux" &&
    ((process.env.WSL_DISTRO_NAME &&
      String(process.env.WSL_DISTRO_NAME).trim() !== "") ||
      os.release().toLowerCase().includes("microsoft"));
  const isWindowsLikeEnvironment = process.platform === "win32" || runningInWsl;

  console.error("");
  console.error(
    isWindowsLikeEnvironment
      ? "Windows 构建环境检查失败。"
      : "构建环境检查失败。"
  );
  console.error(
    isWindowsLikeEnvironment
      ? "当前项目目录不支持 Next.js 构建依赖的链接能力，继续执行通常会报 EISDIR。"
      : "当前项目目录不支持 Next.js 构建依赖的目录符号链接能力。"
  );
  console.error(`检测结果: ${code} ${message}`);
  console.error("");
  console.error("建议操作：");
  if (isWindowsLikeEnvironment) {
    console.error("1. 把仓库移动到 NTFS 分区后再执行 `npm run build`。");
    console.error("2. 或在当前目录执行 `npm run build:ntfs-copy`，临时复制到 NTFS 目录构建。");
  } else {
    console.error("1. 把仓库移动到支持目录符号链接的本地文件系统后再执行 `npm run build`。");
    console.error("2. 检查当前挂载点/共享目录是否禁用了 symlink。");
  }
  process.exit(1);
}
