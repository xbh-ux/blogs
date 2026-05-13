const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, ".next", "standalone");
const standaloneNextDir = path.join(standaloneDir, ".next");
const sourceStaticDir = path.join(rootDir, ".next", "static");
const sourcePublicDir = path.join(rootDir, "public");
const targetStaticDir = path.join(standaloneNextDir, "static");
const targetPublicDir = path.join(standaloneDir, "public");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeDirIfExists(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function copyDir(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`目录不存在，无法复制: ${sourceDir}`);
  }

  removeDirIfExists(targetDir);
  ensureDir(path.dirname(targetDir));
  fs.cpSync(sourceDir, targetDir, { recursive: true });
}

if (!fs.existsSync(standaloneDir)) {
  console.log("未检测到 .next/standalone，跳过 standalone 静态资源同步。");
  process.exit(0);
}

console.log("同步 standalone 运行所需静态资源...");
ensureDir(standaloneNextDir);
copyDir(sourceStaticDir, targetStaticDir);

if (fs.existsSync(sourcePublicDir)) {
  copyDir(sourcePublicDir, targetPublicDir);
}

console.log("standalone 静态资源同步完成。");
console.log(`- static: ${targetStaticDir}`);
if (fs.existsSync(sourcePublicDir)) {
  console.log(`- public: ${targetPublicDir}`);
}