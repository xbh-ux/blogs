import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.VISUAL_BASE_URL || "http://127.0.0.1:3000";
const outputPath = path.join(
  process.cwd(),
  "output",
  "playwright",
  "home-layout-check.png"
);

function round(num) {
  return Math.round(num * 100) / 100;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });

  try {
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1200);

    const metrics = await page.evaluate(() => {
      const toRect = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          selector,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom,
        };
      };

      const hero = toRect(".wiki-home-card--hero");
      const stack = toRect(".home-carousel__stack");
      const cards = [...document.querySelectorAll(".home-carousel__card")].map(
        (el, index) => {
          const rect = el.getBoundingClientRect();
          return {
            index,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            right: rect.right,
            bottom: rect.bottom,
          };
        }
      );

      return { hero, stack, cards };
    });

    if (!metrics.hero || !metrics.stack) {
      throw new Error("未找到图片墙关键布局节点（hero/stack）。");
    }
    if (metrics.cards.length < 3) {
      throw new Error(`图片墙卡片数量异常：${metrics.cards.length}`);
    }

    const heroCenterY = metrics.hero.y + metrics.hero.height / 2;
    const stackCenterY = metrics.stack.y + metrics.stack.height / 2;
    const maxCenterOffset = Math.max(24, metrics.hero.height * 0.22);
    const centerOffset = Math.abs(stackCenterY - heroCenterY);

    if (centerOffset > maxCenterOffset) {
      throw new Error(
        `图片墙垂直中心偏移过大：${round(centerOffset)}px（阈值 ${round(
          maxCenterOffset
        )}px）`
      );
    }

    const margin = 10;
    for (const card of metrics.cards) {
      const outside =
        card.x < metrics.hero.x - margin ||
        card.right > metrics.hero.right + margin ||
        card.y < metrics.hero.y - margin ||
        card.bottom > metrics.hero.bottom + margin;
      if (outside) {
        throw new Error(
          `卡片 ${card.index} 超出图片墙容器：${JSON.stringify(card)}`
        );
      }
    }

    await mkdir(path.dirname(outputPath), { recursive: true });
    await page.screenshot({ path: outputPath, fullPage: true });
    console.log(`visual layout check passed: ${outputPath}`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error("visual layout check failed:", error);
  process.exit(1);
});
