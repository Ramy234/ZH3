// The share card: a picture drawn in the browser from a finished Result. No server, no upload, nothing stored.
// It holds the same facts as the share note and nothing about the person: no name, no place, no postcode.
import { chf, labelBarrier, paybackTitle, type Result } from "./model.ts";

export const CARD = { width: 1080, height: 1350 } as const;

export type CardContent = {
  kicker: string;
  title: string;
  figures: { label: string; value: string; note: string }[];
  payback: string;
  open: string;
  foot: string;
};

export function cardContent(r: Result): CardContent {
  const noPayback = r.paybackYears == null || r.saving <= 40;
  const year = paybackTitle(r);
  return {
    kicker: "Would an electric car already work for an ordinary week?",
    title: r.headline,
    figures: [
      { label: "Keep it", value: chf(r.annualKeep), note: "a year, on these figures" },
      { label: "Switch", value: chf(r.annualSwap), note: r.cash > 0 ? `a year, plus ${chf(r.cash)} at the start` : "a year, nothing extra at the start" },
    ],
    payback: noPayback
      ? "On these figures the electric car does not cost less to run, so the extra price is never covered."
      : r.paybackYears != null && r.paybackYears < 1
        ? "The cheaper running covers the extra price in under a year."
        : `${year} to cover the extra price, if you keep the next car that long.`,
    open: `Still open: “${labelBarrier(r.answers.barrier ?? "unsure")}”.`,
    foot: "Placeholder prices. Not a quote, not an offer. Keeping the car is a fair ending.",
  };
}

const INK = "#1b1916";
const MUTED = "#6e675e";
const LINE = "#e3dcd1";
const CARD_BG = "#fffdf9";
const BG = "#f6f3ed";
const SPRUCE = "#1f4a38";
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

type Ctx = CanvasRenderingContext2D;

function wrap(ctx: Ctx, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function paragraph(ctx: Ctx, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  for (const line of wrap(ctx, text, maxWidth)) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

export function drawCard(ctx: Ctx, c: CardContent, host: string | null): void {
  const { width: W, height: H } = CARD;
  const pad = 90;
  const inner = W - pad * 2;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = SPRUCE;
  ctx.fillRect(pad, 90, 120, 10);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = MUTED;
  ctx.font = `500 30px ${SANS}`;
  let y = paragraph(ctx, c.kicker, pad, 170, inner, 42);

  ctx.fillStyle = INK;
  ctx.font = `400 112px ${SERIF}`;
  y = paragraph(ctx, c.title, pad, y + 90, inner, 126);

  const boxW = (inner - 30) / 2;
  const boxY = y - 56;
  c.figures.forEach((f, i) => {
    const x = pad + i * (boxW + 30);
    ctx.fillStyle = CARD_BG;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, boxY, boxW, 390, 36);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.font = `500 28px ${SANS}`;
    ctx.fillText(f.label.toUpperCase(), x + 36, boxY + 76);
    ctx.fillStyle = INK;
    ctx.font = `400 72px ${SERIF}`;
    ctx.fillText(f.value, x + 36, boxY + 180);
    ctx.fillStyle = MUTED;
    ctx.font = `400 34px ${SANS}`;
    paragraph(ctx, f.note, x + 36, boxY + 250, boxW - 72, 46);
  });

  ctx.fillStyle = INK;
  ctx.font = `400 52px ${SANS}`;
  y = paragraph(ctx, c.payback, pad, boxY + 390 + 100, inner, 70);
  ctx.fillStyle = MUTED;
  ctx.font = `400 42px ${SANS}`;
  paragraph(ctx, c.open, pad, y + 36, inner, 58);

  ctx.fillStyle = MUTED;
  ctx.font = `400 28px ${SANS}`;
  const foot = wrap(ctx, c.foot, inner);
  let fy = H - 90 - (foot.length - 1) * 38;
  for (const line of foot) {
    ctx.fillText(line, pad, fy);
    fy += 38;
  }
  if (host) {
    ctx.textAlign = "right";
    ctx.fillStyle = SPRUCE;
    ctx.font = `500 28px ${SANS}`;
    ctx.fillText(host, W - pad, 120);
    ctx.textAlign = "left";
  }
}

export function cardBlob(r: Result, host: string | null): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD.width;
  canvas.height = CARD.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("no canvas"));
  drawCard(ctx, cardContent(r), host);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no image"))), "image/png"));
}
