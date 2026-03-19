import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { PersonaResult } from "@/lib/personaGenerator";

export type CardTheme = "dark" | "light";

interface SocialCardProps {
  persona: PersonaResult;
  cardRef?: React.RefObject<HTMLDivElement>;
  theme?: CardTheme;
}

const ASCII_RAMP = '@#S08Xox+=;:-,. ';
const CELL_W = 11, CELL_H = 14;

interface ThemeConfig {
  cardBg: string;
  canvasBg: [number, number, number];
  canvasBase: [number, number, number];
  outerDotFill: string;
  outerDotAlpha: number;
  orbAlpha: number;          // max alpha multiplier for orb chars
  logoFill: string;
  logoOpacity: number;
  textPrimary: string;
  textUrl: string;
  avatarBg: string;
  badgeBorder: string;
  badgeColor: string;
  archetypeName: string;
  description: string;
  metricLabel: string;
  divider: string;
  watermark: string;
}

const THEMES: Record<CardTheme, ThemeConfig> = {
  dark: {
    cardBg: "#1800ad",
    canvasBg: [24, 0, 173],
    canvasBase: [80, 90, 210],
    outerDotFill: "rgb(40,20,180)",
    outerDotAlpha: 0.05,
    orbAlpha: 0.45,
    logoFill: "white",
    logoOpacity: 0.55,
    textPrimary: "#ffffff",
    textUrl: "rgba(255,255,255,0.75)",
    avatarBg: "rgba(255,255,255,0.18)",
    badgeBorder: "rgba(255,255,255,0.4)",
    badgeColor: "rgba(255,255,255,0.95)",
    archetypeName: "#FFE500",
    description: "rgba(255,255,255,0.88)",
    metricLabel: "rgba(255,255,255,1.0)",
    divider: "rgba(255,255,255,0.15)",
    watermark: "rgba(255,255,255,0.18)",
  },
  light: {
    cardBg: "#eef0ff",
    canvasBg: [238, 240, 255],
    canvasBase: [24, 0, 173],
    outerDotFill: "rgb(200,200,230)",
    outerDotAlpha: 0.02,
    orbAlpha: 0.18,
    logoFill: "#1800ad",
    logoOpacity: 0.75,
    textPrimary: "#1800ad",
    textUrl: "rgba(24,0,173,0.85)",
    avatarBg: "rgba(24,0,173,0.12)",
    badgeBorder: "rgba(24,0,173,0.4)",
    badgeColor: "rgba(24,0,173,1.0)",
    archetypeName: "#1800ad",
    description: "rgba(24,0,173,1.0)",
    metricLabel: "rgba(24,0,173,1.0)",
    divider: "rgba(24,0,173,0.15)",
    watermark: "rgba(24,0,173,0.2)",
  },
};

function drawOrb(canvas: HTMLCanvasElement, t: ThemeConfig) {
  const canvasW = canvas.offsetWidth || 680;
  const canvasH = canvas.offsetHeight || 382;
  if (!canvasW || !canvasH) return;
  canvas.width = canvasW;
  canvas.height = canvasH;

  const W = Math.ceil(canvasW / CELL_W) + 1;
  const H = Math.ceil(canvasH / CELL_H) + 1;
  const CX_PX = canvasW / 2, CY_PX = canvasH / 2;
  const RADIUS_PX = Math.round(Math.min(canvasW, canvasH) * 0.42);
  const [BG_R, BG_G, BG_B] = t.canvasBg;
  const [BASE_R, BASE_G, BASE_B] = t.canvasBase;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = t.cardBg;
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.font = `bold ${CELL_H - 2}px monospace`;
  ctx.textBaseline = "top";

  for (let row = 0; row < H; row++) {
    for (let col = 0; col < W; col++) {
      const x = col * CELL_W, y = row * CELL_H;
      const dpx = x - CX_PX, dpy = y - CY_PX;
      const dist = Math.sqrt(dpx * dpx + dpy * dpy);

      if (dist > RADIUS_PX) {
        ctx.globalAlpha = t.outerDotAlpha;
        ctx.fillStyle = t.outerDotFill;
        ctx.fillText(".", x, y);
        ctx.globalAlpha = 1;
        continue;
      }

      const edgeBlend = Math.max(0, Math.min(1, (RADIUS_PX - dist) / (RADIUS_PX * 0.25)));
      const nxc = Math.max(-1, Math.min(1, dpx / RADIUS_PX));
      const nyc = Math.max(-1, Math.min(1, dpy / RADIUS_PX));
      const nz = Math.sqrt(Math.max(0, 1 - nxc * nxc - nyc * nyc));
      const lx = -0.5, ly = -0.55, lz = 0.7;
      const llen = Math.sqrt(lx * lx + ly * ly + lz * lz);
      const dot = Math.max(0, (nxc * lx + nyc * ly + nz * lz) / llen);

      const light = 0.18 + dot * 0.6;
      const spec = Math.pow(Math.max(0, dot), 22) * 0.45;
      const ef = Math.pow(nz, 0.5);

      let r = Math.min(255, Math.round((BASE_R * light + 180 * spec) * ef + BASE_R * 0.05));
      let g = Math.min(255, Math.round((BASE_G * light + 180 * spec) * ef + BASE_G * 0.05));
      let b = Math.min(255, Math.round((BASE_B * light + 255 * spec) * ef + BASE_B * 0.05));

      const ed = Math.pow(1 - nz, 2.5) * 0.75;
      r = Math.round(r * (1 - ed) + BG_R * ed);
      g = Math.round(g * (1 - ed) + BG_G * ed);
      b = Math.round(b * (1 - ed) + BG_B * ed);

      r = Math.round(r * edgeBlend + BG_R * (1 - edgeBlend));
      g = Math.round(g * edgeBlend + BG_G * (1 - edgeBlend));
      b = Math.round(b * edgeBlend + BG_B * (1 - edgeBlend));

      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const idx = Math.max(0, Math.min(ASCII_RAMP.length - 1, Math.floor((1 - lum) * (ASCII_RAMP.length - 1))));
      const ch = ASCII_RAMP[idx];
      const mx = Math.max(r, g, b, 1);
      const nr = Math.round(r / mx * 255), ng = Math.round(g / mx * 255), nb2 = Math.round(b / mx * 255);

      ctx.globalAlpha = (edgeBlend * 0.92 + 0.08) * t.orbAlpha;
      // dark theme: glow on bright pixels; light theme: shadow on dark pixels
      const glowCond = t.orbAlpha === 1 ? lum > 0.6 : lum < 0.5;
      if (glowCond) {
        ctx.shadowBlur = t.orbAlpha === 1 ? lum * 10 : (1 - lum) * 6;
        ctx.shadowColor = t.orbAlpha === 1 ? "rgba(150,160,255,0.7)" : "rgba(24,0,173,0.25)";
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = `rgb(${nr},${ng},${nb2})`;
      ctx.fillText(ch, x, y);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
  }
}

export default function SocialCard({ persona, cardRef, theme = "dark" }: SocialCardProps) {
  const { archetype, stats, username } = persona;
  const { cmoScore, authority, clarity, influence, growth } = stats;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = THEMES[theme];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // If already sized, redraw immediately (handles theme switches)
    if (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
      drawOrb(canvas, t);
      return;
    }

    // Otherwise wait for first real dimensions
    const ro = new ResizeObserver(() => {
      if (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
        drawOrb(canvas, t);
        ro.disconnect();
      }
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [theme]); // redraw whenever theme changes

  const initials = username.slice(0, 2).toUpperCase();
  const metrics = [
    { label: "AUTHORITY", value: authority },
    { label: "CLARITY",   value: clarity   },
    { label: "INFLUENCE", value: influence },
    { label: "GROWTH",    value: growth    },
  ];

  return (
    <div
      ref={cardRef}
      className="relative rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: t.cardBg,
        fontFamily: "'Neue Haas Unica', sans-serif",
        width: "680px",
        height: "382px",
        flexShrink: 0,
      }}
    >
      {/* ── ASCII orb background ── */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }} />

      {/* ── Row 1: top bar ── */}
      <div className="relative z-10 flex items-center justify-between px-8 pt-5">
        {/* Logo — uses currentColor so logoFill drives all paths */}
        <div style={{ opacity: t.logoOpacity, pointerEvents: "none", lineHeight: 0, color: t.logoFill }}>
          <svg height="14" viewBox="0 0 203 35" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50.236 5.064V25H47.044V5.064H50.236ZM57.9574 25.336C56.3148 25.336 55.0361 24.8413 54.1214 23.852C53.2254 22.8627 52.7774 21.4067 52.7774 19.484V10.776H55.9694V19.204C55.9694 21.5747 56.9308 22.76 58.8534 22.76C59.8054 22.76 60.5801 22.4053 61.1774 21.696C61.7934 20.9867 62.1014 19.9787 62.1014 18.672V10.776H65.2934V25H62.2694V23.152H62.2134C61.2054 24.608 59.7868 25.336 57.9574 25.336ZM75.3144 10.44C76.957 10.44 78.2264 10.9347 79.1224 11.924C80.037 12.9133 80.4944 14.3693 80.4944 16.292V25H77.3024V16.572C77.3024 14.2013 76.341 13.016 74.4184 13.016C73.4664 13.016 72.6824 13.3707 72.0664 14.08C71.469 14.7893 71.1704 15.7973 71.1704 17.104V25H67.9784V10.776H71.0024V12.624H71.0584C72.0664 11.168 73.485 10.44 75.3144 10.44ZM88.3593 10.356C90.2633 10.356 91.71 10.8227 92.6993 11.756C93.7073 12.6893 94.2113 14.08 94.2113 15.928V21.248C94.2113 22.7787 94.3326 24.0293 94.5753 25H91.6913C91.5606 24.4213 91.4953 23.7587 91.4953 23.012H91.4393C90.394 24.5427 88.798 25.308 86.6513 25.308C85.1953 25.308 84.0286 24.916 83.1513 24.132C82.274 23.3293 81.8353 22.312 81.8353 21.08C81.8353 19.8667 82.246 18.896 83.0673 18.168C83.9073 17.44 85.3166 16.9173 87.2953 16.6C88.49 16.3947 89.7686 16.2547 91.1313 16.18V15.62C91.1313 13.66 90.2073 12.68 88.3593 12.68C87.5006 12.68 86.8286 12.904 86.3433 13.352C85.858 13.8 85.5966 14.4067 85.5593 15.172H82.4233C82.498 13.7533 83.0393 12.596 84.0473 11.7C85.074 10.804 86.5113 10.356 88.3593 10.356ZM91.1313 18.952V18.252C89.918 18.3267 88.826 18.448 87.8553 18.616C86.8286 18.784 86.1006 19.036 85.6713 19.372C85.2606 19.708 85.0553 20.2027 85.0553 20.856C85.0553 21.4907 85.27 22.004 85.6993 22.396C86.1473 22.7693 86.7726 22.956 87.5753 22.956C88.658 22.956 89.5166 22.6387 90.1513 22.004C90.5246 21.612 90.7766 21.2013 90.9073 20.772C91.0566 20.324 91.1313 19.7173 91.1313 18.952ZM103.817 10.58C104.19 10.58 104.582 10.6267 104.993 10.72V13.548C104.638 13.4733 104.265 13.436 103.873 13.436C102.604 13.436 101.624 13.8373 100.933 14.64C100.261 15.424 99.9251 16.5533 99.9251 18.028V25H96.7331V10.776H99.7011V12.876H99.7571C100.709 11.3453 102.062 10.58 103.817 10.58ZM115.841 10.356C117.67 10.356 119.08 10.776 120.069 11.616C121.077 12.4373 121.59 13.632 121.609 15.2H118.529C118.529 13.52 117.624 12.68 115.813 12.68C115.066 12.68 114.488 12.8293 114.077 13.128C113.666 13.4267 113.461 13.8373 113.461 14.36C113.461 14.92 113.676 15.3213 114.105 15.564C114.534 15.8067 115.393 16.0867 116.681 16.404C117.204 16.5347 117.53 16.6187 117.661 16.656C117.81 16.6933 118.118 16.7867 118.585 16.936C119.07 17.0667 119.388 17.188 119.537 17.3C119.705 17.3933 119.966 17.5333 120.321 17.72C120.676 17.9067 120.918 18.1027 121.049 18.308C121.198 18.4947 121.366 18.728 121.553 19.008C121.758 19.288 121.889 19.6053 121.945 19.96C122.02 20.296 122.057 20.6693 122.057 21.08C122.057 22.3867 121.516 23.4413 120.433 24.244C119.35 25.028 117.904 25.42 116.093 25.42C114.152 25.42 112.64 24.9907 111.557 24.132C110.493 23.2547 109.952 21.9853 109.933 20.324H113.181C113.181 21.2013 113.433 21.8733 113.937 22.34C114.46 22.8067 115.197 23.04 116.149 23.04C116.952 23.04 117.577 22.8813 118.025 22.564C118.492 22.2467 118.725 21.8173 118.725 21.276C118.725 20.604 118.482 20.1373 117.997 19.876C117.512 19.596 116.56 19.2787 115.141 18.924C114.618 18.7933 114.264 18.7093 114.077 18.672C113.909 18.616 113.601 18.5227 113.153 18.392C112.705 18.2427 112.388 18.112 112.201 18C112.014 17.8693 111.762 17.692 111.445 17.468C111.146 17.244 110.932 17.0107 110.801 16.768C110.67 16.5067 110.549 16.1987 110.437 15.844C110.325 15.4707 110.269 15.06 110.269 14.612C110.269 13.3427 110.782 12.316 111.809 11.532C112.836 10.748 114.18 10.356 115.841 10.356ZM129.499 22.564C129.91 22.564 130.236 22.5173 130.479 22.424V24.916C129.9 25.084 129.303 25.168 128.687 25.168C127.175 25.168 126.074 24.832 125.383 24.16C124.711 23.4693 124.375 22.3493 124.375 20.8V13.212H121.995V10.776H124.375V7.22H127.567V10.776H130.339V13.212H127.567V20.324C127.567 21.1267 127.716 21.7053 128.015 22.06C128.314 22.396 128.808 22.564 129.499 22.564ZM138.959 10.58C139.333 10.58 139.725 10.6267 140.135 10.72V13.548C139.781 13.4733 139.407 13.436 139.015 13.436C137.746 13.436 136.766 13.8373 136.075 14.64C135.403 15.424 135.067 16.5533 135.067 18.028V25H131.875V10.776H134.843V12.876H134.899C135.851 11.3453 137.205 10.58 138.959 10.58ZM145.803 10.356C147.707 10.356 149.154 10.8227 150.143 11.756C151.151 12.6893 151.655 14.08 151.655 15.928V21.248C151.655 22.7787 151.776 24.0293 152.019 25H149.135C149.004 24.4213 148.939 23.7587 148.939 23.012H148.883C147.838 24.5427 146.242 25.308 144.095 25.308C142.639 25.308 141.472 24.916 140.595 24.132C139.718 23.3293 139.279 22.312 139.279 21.08C139.279 19.8667 139.69 18.896 140.511 18.168C141.351 17.44 142.76 16.9173 144.739 16.6C145.934 16.3947 147.212 16.2547 148.575 16.18V15.62C148.575 13.66 147.651 12.68 145.803 12.68C144.944 12.68 144.272 12.904 143.787 13.352C143.302 13.8 143.04 14.4067 143.003 15.172H139.867C139.942 13.7533 140.483 12.596 141.491 11.7C142.518 10.804 143.955 10.356 145.803 10.356ZM148.575 18.952V18.252C147.362 18.3267 146.27 18.448 145.299 18.616C144.272 18.784 143.544 19.036 143.115 19.372C142.704 19.708 142.499 20.2027 142.499 20.856C142.499 21.4907 142.714 22.004 143.143 22.396C143.591 22.7693 144.216 22.956 145.019 22.956C146.102 22.956 146.96 22.6387 147.595 22.004C147.968 21.612 148.22 21.2013 148.351 20.772C148.5 20.324 148.575 19.7173 148.575 18.952ZM159.615 22.564C160.026 22.564 160.353 22.5173 160.595 22.424V24.916C160.017 25.084 159.419 25.168 158.803 25.168C157.291 25.168 156.19 24.832 155.499 24.16C154.827 23.4693 154.491 22.3493 154.491 20.8V13.212H152.111V10.776H154.491V7.22H157.683V10.776H160.455V13.212H157.683V20.324C157.683 21.1267 157.833 21.7053 158.131 22.06C158.43 22.396 158.925 22.564 159.615 22.564ZM167.462 23.068C168.358 23.068 169.086 22.8533 169.646 22.424C170.225 21.9947 170.589 21.4253 170.738 20.716H174.014C173.734 22.06 173.015 23.18 171.858 24.076C170.701 24.972 169.235 25.42 167.462 25.42C165.315 25.42 163.626 24.72 162.394 23.32C161.181 21.92 160.574 20.0533 160.574 17.72C160.574 15.5733 161.181 13.8093 162.394 12.428C163.626 11.0467 165.297 10.356 167.406 10.356C169.011 10.356 170.374 10.7947 171.494 11.672C172.633 12.5307 173.398 13.7067 173.79 15.2C174.051 16.04 174.182 17.1507 174.182 18.532H163.738C163.794 20.0627 164.158 21.2013 164.83 21.948C165.521 22.6947 166.398 23.068 167.462 23.068ZM169.842 13.66C169.207 13.0253 168.395 12.708 167.406 12.708C166.417 12.708 165.595 13.0253 164.942 13.66C164.307 14.2947 163.925 15.2187 163.794 16.432H170.99C170.878 15.2187 170.495 14.2947 169.842 13.66ZM181.134 10.384C182.852 10.384 184.233 11.1773 185.278 12.764H185.334V10.776H188.358V24.104C188.358 26.1947 187.789 27.7627 186.65 28.808C185.53 29.872 183.944 30.404 181.89 30.404C180.005 30.404 178.53 30.0027 177.466 29.2C176.421 28.416 175.861 27.3147 175.786 25.896H178.978C179.016 26.5867 179.296 27.1187 179.818 27.492C180.341 27.8653 181.05 28.052 181.946 28.052C183.048 28.052 183.869 27.7347 184.41 27.1C184.97 26.4653 185.25 25.4293 185.25 23.992V22.592H185.194C184.168 24.0853 182.796 24.832 181.078 24.832C179.268 24.832 177.83 24.1787 176.766 22.872C175.702 21.5653 175.17 19.8107 175.17 17.608C175.17 15.4053 175.712 13.6507 176.794 12.344C177.877 11.0373 179.324 10.384 181.134 10.384ZM181.862 13.044C180.836 13.044 180.014 13.4547 179.398 14.276C178.801 15.0973 178.502 16.208 178.502 17.608C178.502 19.008 178.801 20.128 179.398 20.968C180.014 21.7893 180.836 22.2 181.862 22.2C182.945 22.2 183.794 21.7893 184.41 20.968C185.045 20.128 185.362 19.008 185.362 17.608C185.362 16.208 185.045 15.0973 184.41 14.276C183.794 13.4547 182.945 13.044 181.862 13.044ZM199.121 10.776H202.425L196.937 25.616C196.265 27.408 195.472 28.64 194.557 29.312C193.661 29.984 192.382 30.32 190.721 30.32C190.142 30.32 189.61 30.2547 189.125 30.124V27.52C189.554 27.6507 190.002 27.716 190.469 27.716C191.328 27.716 191.981 27.5293 192.429 27.156C192.896 26.7827 193.297 26.1013 193.633 25.112L188.425 10.776H191.841L195.397 21.36H195.453L199.121 10.776Z" fill="currentColor"/>
            <path d="M11.6666 11.9981C11.6666 11.8143 11.8156 11.6654 11.9994 11.6654H23.3334V22.9994C23.3334 23.1832 23.1844 23.3321 23.0006 23.3321H11.6666V11.9981Z" fill="currentColor"/>
            <path d="M-4.57764e-05 23.6659C-4.57764e-05 23.4821 0.148945 23.3332 0.332734 23.3332H11.6667V34.6672C11.6667 34.851 11.5178 34.9999 11.334 34.9999H0.332734C0.148944 34.9999 -4.57764e-05 34.851 -4.57764e-05 34.6672V23.6659Z" fill="currentColor"/>
            <path d="M23.333 0.332779C23.333 0.14899 23.482 0 23.6657 0H34.667C34.8508 0 34.9998 0.148991 34.9998 0.33278V11.334C34.9998 11.5178 34.8508 11.6668 34.667 11.6668H23.333V0.332779Z" fill="currentColor"/>
            <path d="M12.3328 23.333C11.816 23.3327 11.6654 23.4736 11.6662 23.9997L10.9995 23.333C11.5124 23.3333 11.6657 23.1944 11.6662 22.6663L12.3328 23.333Z" fill="currentColor"/>
            <path d="M23.9996 11.6663C23.4827 11.6661 23.3322 11.807 23.3329 12.333L22.6662 11.6663C23.1791 11.6666 23.3325 11.5277 23.3329 10.9997L23.9996 11.6663Z" fill="currentColor"/>
          </svg>
        </div>

        {/* User block */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-bold text-base leading-tight" style={{ color: t.textPrimary, fontFamily: "'Neue Haas Unica', sans-serif", fontWeight: 700 }}>
              @{username}
            </div>
          </div>
          <div className="relative rounded-full flex-shrink-0 overflow-hidden" style={{ width: 44, height: 44 }}>
            <div className="absolute inset-0 flex items-center justify-center font-bold text-sm select-none"
              style={{ background: t.avatarBg, color: t.textPrimary, fontFamily: "'Neue Haas Unica', sans-serif", fontWeight: 700 }}>
              {initials}
            </div>
            <img src={`https://unavatar.io/x/${username}`} alt={`@${username}`}
              className="absolute inset-0 w-full h-full object-cover rounded-full"
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
          </div>
        </div>
      </div>

      {/* ── Badge ── */}
      <div className="relative z-10 px-8 pt-2 pb-0">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-[10px] tracking-widest uppercase"
          style={{ border: `1px solid ${t.badgeBorder}`, color: t.badgeColor, fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
          MARKETEER ARCHETYPE
          <svg viewBox="0 0 16 16" className="w-3 h-3 opacity-60" fill="currentColor">
            <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1zm0 1.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM8 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 6zm0-2.5a.875.875 0 1 1 0 1.75A.875.875 0 0 1 8 3.5z"/>
          </svg>
        </div>
      </div>

      {/* ── Hero row ── */}
      <div className="relative z-10 flex items-center justify-between px-8 flex-1 gap-6" style={{ paddingTop: "4px", paddingBottom: "4px" }}>
        {/* Left: score + archetype */}
        <div className="flex flex-col justify-center" style={{ flex: "0 0 52%" }}>
          <div className="leading-none select-none"
            style={{ fontSize: "clamp(4rem, 10vw, 7.5rem)", fontWeight: 700, fontStyle: "italic", fontFamily: "'Neue Haas Unica', sans-serif", color: t.textPrimary }}>
            {cmoScore}
          </div>
          <div className="tracking-widest uppercase mt-2"
            style={{ fontSize: "13px", color: t.archetypeName, fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 700 }}>
            {archetype.name}
          </div>
          <div className="mt-1 leading-relaxed"
            style={{ fontSize: "10px", color: t.description, fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Helvetica, Arial, sans-serif", maxWidth: "90%", wordBreak: "break-word" }}>
            {archetype.emoji} {archetype.description}
          </div>
        </div>

        {/* Right: metrics */}
        <div className="flex flex-col justify-center gap-3" style={{ flex: "0 0 44%" }}>
          {metrics.map(({ label, value }) => (
            <div key={label} className="flex items-baseline justify-between">
              <span className="tracking-widest uppercase"
                style={{ fontSize: "11px", color: t.metricLabel, fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Helvetica, Arial, sans-serif", letterSpacing: "0.12em" }}>
                {label}
              </span>
              <span className="font-bold"
                style={{ fontSize: "clamp(1.1rem, 2.5vw, 1.6rem)", fontFamily: "'Neue Haas Unica', sans-serif", fontWeight: 700, color: t.textPrimary }}>
                +{value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="relative z-10 mx-8" style={{ height: "1px", background: t.divider }} />

      {/* ── Bottom watermark ── */}
      <div className="relative z-10 flex items-end justify-center px-8 py-5">
        <div className="tracking-widest" style={{ fontSize: "9px", color: t.watermark, fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
          marketeer.lunarstrategy.com
        </div>
      </div>
    </div>
  );
}

// Animated wrapper — scales card to fill available width
export function SocialCardAnimated({ persona, cardRef, theme = "dark" }: { persona: PersonaResult; cardRef?: React.RefObject<HTMLDivElement>; theme?: CardTheme }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setScale(entry.contentRect.width / 680);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ width: "100%" }}
    >
      <div ref={wrapperRef} style={{ width: "100%", aspectRatio: "16 / 9", position: "relative", overflow: "hidden", borderRadius: "1rem" }}>
        <div style={{ position: "absolute", top: 0, left: 0, transformOrigin: "top left", transform: `scale(${scale})` }}>
          <SocialCard persona={persona} cardRef={cardRef} theme={theme} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Pure-canvas renderer — used by clipboard copy, no html2canvas ───────────

function _loadImg(src: string, ms = 3000): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("load error"));
    img.src = src;
    setTimeout(() => rej(new Error("timeout")), ms);
  });
}

function _wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(" ");
  let line = "", cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, cy); line = word; cy += lineH; }
    else line = test;
  }
  if (line) ctx.fillText(line, x, cy);
}

const _logoSvg = (fill: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 203 35">
<path fill="${fill}" d="M50.236 5.064V25H47.044V5.064H50.236ZM57.9574 25.336C56.3148 25.336 55.0361 24.8413 54.1214 23.852C53.2254 22.8627 52.7774 21.4067 52.7774 19.484V10.776H55.9694V19.204C55.9694 21.5747 56.9308 22.76 58.8534 22.76C59.8054 22.76 60.5801 22.4053 61.1774 21.696C61.7934 20.9867 62.1014 19.9787 62.1014 18.672V10.776H65.2934V25H62.2694V23.152H62.2134C61.2054 24.608 59.7868 25.336 57.9574 25.336ZM75.3144 10.44C76.957 10.44 78.2264 10.9347 79.1224 11.924C80.037 12.9133 80.4944 14.3693 80.4944 16.292V25H77.3024V16.572C77.3024 14.2013 76.341 13.016 74.4184 13.016C73.4664 13.016 72.6824 13.3707 72.0664 14.08C71.469 14.7893 71.1704 15.7973 71.1704 17.104V25H67.9784V10.776H71.0024V12.624H71.0584C72.0664 11.168 73.485 10.44 75.3144 10.44ZM88.3593 10.356C90.2633 10.356 91.71 10.8227 92.6993 11.756C93.7073 12.6893 94.2113 14.08 94.2113 15.928V21.248C94.2113 22.7787 94.3326 24.0293 94.5753 25H91.6913C91.5606 24.4213 91.4953 23.7587 91.4953 23.012H91.4393C90.394 24.5427 88.798 25.308 86.6513 25.308C85.1953 25.308 84.0286 24.916 83.1513 24.132C82.274 23.3293 81.8353 22.312 81.8353 21.08C81.8353 19.8667 82.246 18.896 83.0673 18.168C83.9073 17.44 85.3166 16.9173 87.2953 16.6C88.49 16.3947 89.7686 16.2547 91.1313 16.18V15.62C91.1313 13.66 90.2073 12.68 88.3593 12.68C87.5006 12.68 86.8286 12.904 86.3433 13.352C85.858 13.8 85.5966 14.4067 85.5593 15.172H82.4233C82.498 13.7533 83.0393 12.596 84.0473 11.7C85.074 10.804 86.5113 10.356 88.3593 10.356ZM91.1313 18.952V18.252C89.918 18.3267 88.826 18.448 87.8553 18.616C86.8286 18.784 86.1006 19.036 85.6713 19.372C85.2606 19.708 85.0553 20.2027 85.0553 20.856C85.0553 21.4907 85.27 22.004 85.6993 22.396C86.1473 22.7693 86.7726 22.956 87.5753 22.956C88.658 22.956 89.5166 22.6387 90.1513 22.004C90.5246 21.612 90.7766 21.2013 90.9073 20.772C91.0566 20.324 91.1313 19.7173 91.1313 18.952ZM103.817 10.58C104.19 10.58 104.582 10.6267 104.993 10.72V13.548C104.638 13.4733 104.265 13.436 103.873 13.436C102.604 13.436 101.624 13.8373 100.933 14.64C100.261 15.424 99.9251 16.5533 99.9251 18.028V25H96.7331V10.776H99.7011V12.876H99.7571C100.709 11.3453 102.062 10.58 103.817 10.58ZM115.841 10.356C117.67 10.356 119.08 10.776 120.069 11.616C121.077 12.4373 121.59 13.632 121.609 15.2H118.529C118.529 13.52 117.624 12.68 115.813 12.68C115.066 12.68 114.488 12.8293 114.077 13.128C113.666 13.4267 113.461 13.8373 113.461 14.36C113.461 14.92 113.676 15.3213 114.105 15.564C114.534 15.8067 115.393 16.0867 116.681 16.404C117.204 16.5347 117.53 16.6187 117.661 16.656C117.81 16.6933 118.118 16.7867 118.585 16.936C119.07 17.0667 119.388 17.188 119.537 17.3C119.705 17.3933 119.966 17.5333 120.321 17.72C120.676 17.9067 120.918 18.1027 121.049 18.308C121.198 18.4947 121.366 18.728 121.553 19.008C121.758 19.288 121.889 19.6053 121.945 19.96C122.02 20.296 122.057 20.6693 122.057 21.08C122.057 22.3867 121.516 23.4413 120.433 24.244C119.35 25.028 117.904 25.42 116.093 25.42C114.152 25.42 112.64 24.9907 111.557 24.132C110.493 23.2547 109.952 21.9853 109.933 20.324H113.181C113.181 21.2013 113.433 21.8733 113.937 22.34C114.46 22.8067 115.197 23.04 116.149 23.04C116.952 23.04 117.577 22.8813 118.025 22.564C118.492 22.2467 118.725 21.8173 118.725 21.276C118.725 20.604 118.482 20.1373 117.997 19.876C117.512 19.596 116.56 19.2787 115.141 18.924C114.618 18.7933 114.264 18.7093 114.077 18.672C113.909 18.616 113.601 18.5227 113.153 18.392C112.705 18.2427 112.388 18.112 112.201 18C112.014 17.8693 111.762 17.692 111.445 17.468C111.146 17.244 110.932 17.0107 110.801 16.768C110.67 16.5067 110.549 16.1987 110.437 15.844C110.325 15.4707 110.269 15.06 110.269 14.612C110.269 13.3427 110.782 12.316 111.809 11.532C112.836 10.748 114.18 10.356 115.841 10.356ZM129.499 22.564C129.91 22.564 130.236 22.5173 130.479 22.424V24.916C129.9 25.084 129.303 25.168 128.687 25.168C127.175 25.168 126.074 24.832 125.383 24.16C124.711 23.4693 124.375 22.3493 124.375 20.8V13.212H121.995V10.776H124.375V7.22H127.567V10.776H130.339V13.212H127.567V20.324C127.567 21.1267 127.716 21.7053 128.015 22.06C128.314 22.396 128.808 22.564 129.499 22.564ZM138.959 10.58C139.333 10.58 139.725 10.6267 140.135 10.72V13.548C139.781 13.4733 139.407 13.436 139.015 13.436C137.746 13.436 136.766 13.8373 136.075 14.64C135.403 15.424 135.067 16.5533 135.067 18.028V25H131.875V10.776H134.843V12.876H134.899C135.851 11.3453 137.205 10.58 138.959 10.58ZM145.803 10.356C147.707 10.356 149.154 10.8227 150.143 11.756C151.151 12.6893 151.655 14.08 151.655 15.928V21.248C151.655 22.7787 151.776 24.0293 152.019 25H149.135C149.004 24.4213 148.939 23.7587 148.939 23.012H148.883C147.838 24.5427 146.242 25.308 144.095 25.308C142.639 25.308 141.472 24.916 140.595 24.132C139.718 23.3293 139.279 22.312 139.279 21.08C139.279 19.8667 139.69 18.896 140.511 18.168C141.351 17.44 142.76 16.9173 144.739 16.6C145.934 16.3947 147.212 16.2547 148.575 16.18V15.62C148.575 13.66 147.651 12.68 145.803 12.68C144.944 12.68 144.272 12.904 143.787 13.352C143.302 13.8 143.04 14.4067 143.003 15.172H139.867C139.942 13.7533 140.483 12.596 141.491 11.7C142.518 10.804 143.955 10.356 145.803 10.356ZM148.575 18.952V18.252C147.362 18.3267 146.27 18.448 145.299 18.616C144.272 18.784 143.544 19.036 143.115 19.372C142.704 19.708 142.499 20.2027 142.499 20.856C142.499 21.4907 142.714 22.004 143.143 22.396C143.591 22.7693 144.216 22.956 145.019 22.956C146.102 22.956 146.96 22.6387 147.595 22.004C147.968 21.612 148.22 21.2013 148.351 20.772C148.5 20.324 148.575 19.7173 148.575 18.952ZM159.615 22.564C160.026 22.564 160.353 22.5173 160.595 22.424V24.916C160.017 25.084 159.419 25.168 158.803 25.168C157.291 25.168 156.19 24.832 155.499 24.16C154.827 23.4693 154.491 22.3493 154.491 20.8V13.212H152.111V10.776H154.491V7.22H157.683V10.776H160.455V13.212H157.683V20.324C157.683 21.1267 157.833 21.7053 158.131 22.06C158.43 22.396 158.925 22.564 159.615 22.564ZM167.462 23.068C168.358 23.068 169.086 22.8533 169.646 22.424C170.225 21.9947 170.589 21.4253 170.738 20.716H174.014C173.734 22.06 173.015 23.18 171.858 24.076C170.701 24.972 169.235 25.42 167.462 25.42C165.315 25.42 163.626 24.72 162.394 23.32C161.181 21.92 160.574 20.0533 160.574 17.72C160.574 15.5733 161.181 13.8093 162.394 12.428C163.626 11.0467 165.297 10.356 167.406 10.356C169.011 10.356 170.374 10.7947 171.494 11.672C172.633 12.5307 173.398 13.7067 173.79 15.2C174.051 16.04 174.182 17.1507 174.182 18.532H163.738C163.794 20.0627 164.158 21.2013 164.83 21.948C165.521 22.6947 166.398 23.068 167.462 23.068ZM169.842 13.66C169.207 13.0253 168.395 12.708 167.406 12.708C166.417 12.708 165.595 13.0253 164.942 13.66C164.307 14.2947 163.925 15.2187 163.794 16.432H170.99C170.878 15.2187 170.495 14.2947 169.842 13.66ZM181.134 10.384C182.852 10.384 184.233 11.1773 185.278 12.764H185.334V10.776H188.358V24.104C188.358 26.1947 187.789 27.7627 186.65 28.808C185.53 29.872 183.944 30.404 181.89 30.404C180.005 30.404 178.53 30.0027 177.466 29.2C176.421 28.416 175.861 27.3147 175.786 25.896H178.978C179.016 26.5867 179.296 27.1187 179.818 27.492C180.341 27.8653 181.05 28.052 181.946 28.052C183.048 28.052 183.869 27.7347 184.41 27.1C184.97 26.4653 185.25 25.4293 185.25 23.992V22.592H185.194C184.168 24.0853 182.796 24.832 181.078 24.832C179.268 24.832 177.83 24.1787 176.766 22.872C175.702 21.5653 175.17 19.8107 175.17 17.608C175.17 15.4053 175.712 13.6507 176.794 12.344C177.877 11.0373 179.324 10.384 181.134 10.384ZM181.862 13.044C180.836 13.044 180.014 13.4547 179.398 14.276C178.801 15.0973 178.502 16.208 178.502 17.608C178.502 19.008 178.801 20.128 179.398 20.968C180.014 21.7893 180.836 22.2 181.862 22.2C182.945 22.2 183.794 21.7893 184.41 20.968C185.045 20.128 185.362 19.008 185.362 17.608C185.362 16.208 185.045 15.0973 184.41 14.276C183.794 13.4547 182.945 13.044 181.862 13.044ZM199.121 10.776H202.425L196.937 25.616C196.265 27.408 195.472 28.64 194.557 29.312C193.661 29.984 192.382 30.32 190.721 30.32C190.142 30.32 189.61 30.2547 189.125 30.124V27.52C189.554 27.6507 190.002 27.716 190.469 27.716C191.328 27.716 191.981 27.5293 192.429 27.156C192.896 26.7827 193.297 26.1013 193.633 25.112L188.425 10.776H191.841L195.397 21.36H195.453L199.121 10.776Z"/>
<path fill="${fill}" d="M11.6666 11.9981C11.6666 11.8143 11.8156 11.6654 11.9994 11.6654H23.3334V22.9994C23.3334 23.1832 23.1844 23.3321 23.0006 23.3321H11.6666V11.9981Z"/>
<path fill="${fill}" d="M-4.57764e-05 23.6659C-4.57764e-05 23.4821 0.148945 23.3332 0.332734 23.3332H11.6667V34.6672C11.6667 34.851 11.5178 34.9999 11.334 34.9999H0.332734C0.148944 34.9999 -4.57764e-05 34.851 -4.57764e-05 34.6672V23.6659Z"/>
<path fill="${fill}" d="M23.333 0.332779C23.333 0.14899 23.482 0 23.6657 0H34.667C34.8508 0 34.9998 0.148991 34.9998 0.33278V11.334C34.9998 11.5178 34.8508 11.6668 34.667 11.6668H23.333V0.332779Z"/>
<path fill="${fill}" d="M12.3328 23.333C11.816 23.3327 11.6654 23.4736 11.6662 23.9997L10.9995 23.333C11.5124 23.3333 11.6657 23.1944 11.6662 22.6663L12.3328 23.333Z"/>
<path fill="${fill}" d="M23.9996 11.6663C23.4827 11.6661 23.3322 11.807 23.3329 12.333L22.6662 11.6663C23.1791 11.6666 23.3325 11.5277 23.3329 10.9997L23.9996 11.6663Z"/>
</svg>`;

/** Renders the card entirely via Canvas 2D — no html2canvas, no DOM capture. Always produces a clean 1360×764 (2×) PNG. */
export async function renderCardToCanvas(persona: PersonaResult, theme: CardTheme): Promise<HTMLCanvasElement> {
  const S = 2, W = 680, H = 382;
  const t = THEMES[theme];
  const { archetype, stats, username } = persona;

  // Ensure Neue Haas Unica is loaded before drawing on a detached canvas
  await Promise.all([
    document.fonts.load(`700 12px "Neue Haas Unica"`),
    document.fonts.load(`300 12px "Neue Haas Unica"`),
  ]);

  // Orb: drawOrb falls back to 680×382 when offsetWidth=0 (detached canvas)
  const orbC = document.createElement("canvas");
  drawOrb(orbC, t);

  // Output canvas at 2× then upscale orb to fill it
  const canvas = document.createElement("canvas");
  canvas.width = W * S;
  canvas.height = H * S;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(orbC, 0, 0, W * S, H * S);

  // All drawing in logical 680×382 space
  ctx.save();
  ctx.scale(S, S);

  const FONT = "'Neue Haas Unica', 'Helvetica Neue', Helvetica, Arial, sans-serif";
  const PX = 32;

  // ── Logo ──
  try {
    const url = URL.createObjectURL(new Blob([_logoSvg(t.logoFill)], { type: "image/svg+xml" }));
    const logo = await _loadImg(url, 2000);
    ctx.globalAlpha = t.logoOpacity;
    ctx.drawImage(logo, PX, 23, 81, 14); // viewBox 203×35 → scaled to 81×14
    ctx.globalAlpha = 1;
    URL.revokeObjectURL(url);
  } catch { /* logo optional */ }

  // ── Username + URL ──
  ctx.textBaseline = "top";
  ctx.textAlign = "right";
  ctx.font = `700 14px ${FONT}`;
  ctx.fillStyle = t.textPrimary;
  ctx.fillText(`@${username}`, W - PX - 56, 22);
  ctx.font = `400 10px ${FONT}`;
  ctx.fillStyle = t.textUrl;

  // ── Avatar ──
  const AR = 22, AX = W - PX - 44, AY = 18;
  ctx.fillStyle = t.avatarBg;
  ctx.beginPath(); ctx.arc(AX + AR, AY + AR, AR, 0, Math.PI * 2); ctx.fill();
  try {
    const av = await _loadImg(`https://unavatar.io/x/${username}`, 3000);
    ctx.save();
    ctx.beginPath(); ctx.arc(AX + AR, AY + AR, AR, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(av, AX, AY, 44, 44);
    ctx.restore();
  } catch {
    ctx.fillStyle = t.textPrimary;
    ctx.font = `700 13px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(username.slice(0, 2).toUpperCase(), AX + AR, AY + AR);
    ctx.textBaseline = "top";
  }

  // ── MARKETEER ARCHETYPE badge ──
  const BX = PX, BY = 66, BW = 152, BH = 20;
  ctx.strokeStyle = t.badgeBorder; ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(BX, BY, BW, BH, 3); else ctx.rect(BX, BY, BW, BH);
  ctx.stroke();
  ctx.fillStyle = t.badgeColor; ctx.font = `400 8px ${FONT}`;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText("MARKETEER ARCHETYPE", BX + 8, BY + BH / 2);

  // ── Score ──
  const HY = 95; // hero section top
  ctx.fillStyle = t.textPrimary;
  ctx.font = `italic 700 110px ${FONT}`;
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.fillText(`${stats.cmoScore}`, PX, HY + 12);

  // ── Archetype name ──
  ctx.fillStyle = t.archetypeName;
  ctx.font = `700 12px ${FONT}`;
  ctx.fillText(archetype.name.toUpperCase(), PX, HY + 128);

  // ── Description ──
  ctx.fillStyle = t.description;
  ctx.font = `400 9.5px ${FONT}`;
  _wrap(ctx, `${archetype.emoji} ${archetype.description}`, PX, HY + 146, W * 0.5 - PX, 13);

  // ── Metrics (right column) ──
  const metrics = [
    { label: "AUTHORITY", value: stats.authority },
    { label: "CLARITY",   value: stats.clarity   },
    { label: "INFLUENCE", value: stats.influence  },
    { label: "GROWTH",    value: stats.growth     },
  ];
  const RX = W * 0.56;
  for (let i = 0; i < metrics.length; i++) {
    const MY = 128 + i * 52;
    ctx.fillStyle = t.metricLabel; ctx.font = `400 10px ${FONT}`;
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(metrics[i].label, RX, MY);
    ctx.fillStyle = t.textPrimary; ctx.font = `italic 700 28px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(`+${metrics[i].value}`, W - PX, MY - 6);
  }

  // ── Divider ──
  const DIV_Y = 340;
  ctx.fillStyle = t.divider;
  ctx.fillRect(PX, DIV_Y, W - PX * 2, 1);

  // ── Watermark ──
  ctx.fillStyle = t.watermark; ctx.font = `400 8px ${FONT}`;
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.fillText("marketeer.lunarstrategy.com", W / 2, DIV_Y + 12);

  ctx.restore();
  return canvas;
}
