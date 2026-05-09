import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.VISUAL_BASE_URL || "http://127.0.0.1:3000";
const outputDir = path.join(process.cwd(), "output", "playwright", "home-layout");

const scenarios = [
  {
    name: "desktop-1600",
    viewport: { width: 1600, height: 1100 },
    maxCenterRatio: 0.22,
    minEnvelopeWidthRatio: 0.36,
    minEnvelopeLeftRatio: 0.22,
    minEnvelopeWidthFloor: 260,
  },
  {
    name: "laptop-1366",
    viewport: { width: 1366, height: 920 },
    maxCenterRatio: 0.24,
    minEnvelopeWidthRatio: 0.34,
    minEnvelopeLeftRatio: 0.2,
    minEnvelopeWidthFloor: 240,
  },
  {
    name: "tablet-1024",
    viewport: { width: 1024, height: 900 },
    maxCenterRatio: 0.26,
    minEnvelopeWidthRatio: 0.32,
    minEnvelopeLeftRatio: 0.09,
    minEnvelopeWidthFloor: 220,
  },
  {
    name: "mobile-390",
    viewport: { width: 390, height: 844 },
    maxCenterRatio: 0.28,
    minEnvelopeWidthRatio: 0.42,
    minEnvelopeLeftRatio: 0.12,
    minEnvelopeWidthFloor: 180,
  },
];

function round(num) {
  return Math.round(num * 100) / 100;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await mkdir(outputDir, { recursive: true });

    for (const scenario of scenarios) {
      await page.setViewportSize(scenario.viewport);
      await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1200);
      const screenshotPath = path.join(outputDir, `${scenario.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

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
        const cards = [...document.querySelectorAll(".home-carousel__card")]
          .map((el, index) => {
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
          })
          .filter((card) => card.width > 1 && card.height > 1);

        const cardEnvelope = cards.reduce((acc, card) => {
          if (!acc) {
            return {
              x: card.x,
              y: card.y,
              right: card.right,
              bottom: card.bottom,
            };
          }

          return {
            x: Math.min(acc.x, card.x),
            y: Math.min(acc.y, card.y),
            right: Math.max(acc.right, card.right),
            bottom: Math.max(acc.bottom, card.bottom),
          };
        }, null);

        return { hero, stack, cards, cardEnvelope };
      });

      if (!metrics.hero || !metrics.stack) {
        throw new Error(
          `[${scenario.name}] 未找到图片墙关键布局节点（hero/stack）。`
        );
      }
      if (metrics.cards.length < 3) {
        throw new Error(`[${scenario.name}] 图片墙卡片数量异常：${metrics.cards.length}`);
      }
      if (!metrics.cardEnvelope) {
        throw new Error(`[${scenario.name}] 未能计算图片墙卡片包围盒。`);
      }

      const heroCenterY = metrics.hero.y + metrics.hero.height / 2;
      const stackCenterY = metrics.stack.y + metrics.stack.height / 2;
      const maxCenterOffset = Math.max(24, metrics.hero.height * scenario.maxCenterRatio);
      const centerOffset = Math.abs(stackCenterY - heroCenterY);

      if (centerOffset > maxCenterOffset) {
        throw new Error(
          `[${scenario.name}] 图片墙垂直中心偏移过大：${round(centerOffset)}px（阈值 ${round(
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
            `[${scenario.name}] 卡片 ${card.index} 超出图片墙容器：${JSON.stringify(card)}`
          );
        }
      }

      const envelopeWidth = metrics.cardEnvelope.right - metrics.cardEnvelope.x;
      const minEnvelopeWidth = Math.max(
        scenario.minEnvelopeWidthFloor,
        metrics.hero.width * scenario.minEnvelopeWidthRatio
      );
      if (envelopeWidth < minEnvelopeWidth) {
        throw new Error(
          `[${scenario.name}] 图片墙横向占位过窄：${round(envelopeWidth)}px（阈值 ${round(
            minEnvelopeWidth
          )}px）`
        );
      }

      const minEnvelopeLeft = metrics.hero.x + metrics.hero.width * scenario.minEnvelopeLeftRatio;
      if (metrics.cardEnvelope.x < minEnvelopeLeft) {
        throw new Error(
          `[${scenario.name}] 图片墙左侧侵入标题区：${round(metrics.cardEnvelope.x)}px（最小应为 ${round(
            minEnvelopeLeft
          )}px）`
        );
      }

      console.log(`visual layout check passed [${scenario.name}]: ${screenshotPath}`);
    }
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error("visual layout check failed:", error);
  process.exit(1);
});
