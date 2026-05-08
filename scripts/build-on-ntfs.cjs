const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const projectRoot = process.cwd();
const targetRoot = path.join(
  process.env.LOCALAPPDATA || os.tmpdir(),
  "blogs-next-builds"
);
const dependencyCacheRoot = path.join(targetRoot, "_dependency-cache");
const targetDir = path.join(
  targetRoot,
  `blogs-next-${new Date().toISOString().replace(/[:.]/g, "-")}`
);
const buildTimeoutMs = Number(
  process.env.BLOGS_NEXT_BUILD_TIMEOUT_MS || 15 * 60 * 1000
);
const retainedBuildCount = Number(process.env.BLOGS_NEXT_KEEP_BUILDS || 3);

const excludedNames = new Set([
  ".git",
  ".next",
  "node_modules",
  "output",
  "crawl-output",
  ".claude",
  ".playwright-cli",
  ".tmp-next-build-check",
  ".tmp-junction-check",
]);

function shouldCopy(sourcePath) {
  const relativePath = path.relative(projectRoot, sourcePath);
  const segments = relativePath.split(path.sep).filter(Boolean);
  const topLevelName = segments[0] || path.basename(sourcePath);

  if (segments.length <= 1 && excludedNames.has(topLevelName)) {
    return false;
  }

  const name = path.basename(sourcePath);
  if (/\.log$/i.test(name) || name === "tsconfig.tsbuildinfo") {
    return false;
  }

  return true;
}

function getDependencyCacheDir() {
  const packageLockPath = path.join(projectRoot, "package-lock.json");
  const packageJsonPath = path.join(projectRoot, "package.json");
  const hash = crypto
    .createHash("sha256")
    .update(fs.readFileSync(packageJsonPath))
    .update(fs.readFileSync(packageLockPath))
    .digest("hex")
    .slice(0, 16);

  return path.join(dependencyCacheRoot, `deps-${hash}`);
}

function getCachedNodeModulesDir(cacheDir) {
  return path.join(cacheDir, "node_modules");
}

function ensureDependencyCache(cacheDir) {
  const cachedNodeModulesDir = getCachedNodeModulesDir(cacheDir);
  if (fs.existsSync(cachedNodeModulesDir)) {
    console.log(`复用 NTFS 依赖缓存: ${cacheDir}`);
    return;
  }

  const sourceNodeModules = path.join(projectRoot, "node_modules");
  if (!fs.existsSync(sourceNodeModules)) {
    throw new Error("未找到源 node_modules，请先在项目根目录安装依赖。");
  }

  const preparingDir = `${cacheDir}.preparing`;
  removeDirectory(preparingDir);
  fs.mkdirSync(path.dirname(cacheDir), { recursive: true });
  console.log(`初始化 NTFS 依赖缓存: ${cacheDir}`);
  fs.mkdirSync(preparingDir, { recursive: true });
  copyDirectory(sourceNodeModules, getCachedNodeModulesDir(preparingDir));
  fs.renameSync(preparingDir, cacheDir);
}

function attachDependencyCache(cacheDir) {
  const targetNodeModules = path.join(targetDir, "node_modules");
  fs.symlinkSync(getCachedNodeModulesDir(cacheDir), targetNodeModules, "junction");
}

function copyDirectory(sourcePath, destinationPath) {
  if (process.platform !== "win32") {
    fs.cpSync(sourcePath, destinationPath, { recursive: true });
    return;
  }

  const result = spawnSync(
    "robocopy",
    [
      sourcePath,
      destinationPath,
      "/E",
      "/R:2",
      "/W:1",
      "/NFL",
      "/NDL",
      "/NJH",
      "/NJS",
      "/NP",
    ],
    { encoding: "utf8" }
  );

  if ((result.status ?? 16) >= 8) {
    throw new Error(
      `复制目录失败: ${result.stderr || result.stdout || sourcePath}`
    );
  }
}

function cleanupOldBuilds() {
  if (!Number.isFinite(retainedBuildCount) || retainedBuildCount < 1) {
    return;
  }

  const buildDirs = fs
    .readdirSync(targetRoot, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.startsWith("blogs-next-") &&
        path.join(targetRoot, entry.name) !== targetDir
    )
    .map((entry) => {
      const fullPath = path.join(targetRoot, entry.name);
      return {
        fullPath,
        modifiedAt: fs.statSync(fullPath).mtimeMs,
      };
    })
    .sort((a, b) => b.modifiedAt - a.modifiedAt);

  for (const staleBuild of buildDirs.slice(retainedBuildCount - 1)) {
    removeDirectory(staleBuild.fullPath);
  }
}

function cleanupOldDependencyCaches(activeCacheDir) {
  if (!fs.existsSync(dependencyCacheRoot)) {
    return;
  }

  const caches = fs
    .readdirSync(dependencyCacheRoot, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() && entry.name.startsWith("deps-")
    )
    .map((entry) => {
      const fullPath = path.join(dependencyCacheRoot, entry.name);
      return {
        fullPath,
        modifiedAt: fs.statSync(fullPath).mtimeMs,
      };
    })
    .sort((a, b) => b.modifiedAt - a.modifiedAt);

  for (const staleCache of caches.filter((item) => item.fullPath !== activeCacheDir).slice(2)) {
    removeDirectory(staleCache.fullPath);
  }
}

function removeDirectory(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) {
    return;
  }

  if (process.platform !== "win32") {
    fs.rmSync(targetPath, { recursive: true, force: true });
    return;
  }

  try {
    fs.rmSync(targetPath, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  } catch (error) {
    if (fs.existsSync(targetPath)) {
      throw new Error(
        `清理旧构建目录失败: ${error instanceof Error ? error.message : targetPath}`
      );
    }
  }
}

fs.mkdirSync(targetRoot, { recursive: true });
fs.mkdirSync(dependencyCacheRoot, { recursive: true });

const dependencyCacheDir = getDependencyCacheDir();
ensureDependencyCache(dependencyCacheDir);

console.log(`复制项目到 NTFS 临时目录: ${targetDir}`);
fs.cpSync(projectRoot, targetDir, {
  recursive: true,
  filter: shouldCopy,
});
attachDependencyCache(dependencyCacheDir);

console.log("开始在 NTFS 临时目录执行生产构建...");

const result = spawnSync("npm run build", {
  cwd: targetDir,
  encoding: "utf8",
  shell: true,
  timeout: buildTimeoutMs,
  maxBuffer: 10 * 1024 * 1024,
});

if (result.stdout) {
  process.stdout.write(result.stdout);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.error || result.status !== 0) {
  console.error("");
  if (result.error) {
    console.error(`启动构建进程失败: ${result.error.message}`);
  }
  console.error(`构建退出码: ${result.status ?? "null"}`);
  console.error(`临时目录构建失败，保留现场以便继续排查: ${targetDir}`);
  process.exit(result.status ?? 1);
}

cleanupOldBuilds();
cleanupOldDependencyCaches(dependencyCacheDir);

console.log("");
console.log("NTFS 临时构建成功。");
console.log(`构建目录: ${targetDir}`);
console.log(`产物目录: ${path.join(targetDir, ".next")}`);
