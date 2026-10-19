import html2canvas, { Options } from "html2canvas";

/**
 * Custom wrapper around html2canvas to fix compatibility issues with Tailwind CSS v4
 * which uses `oklch(...)` color functions unsupported by html2canvas CSS parser.
 */

function parseAlpha(valStr?: string): number {
  if (!valStr) return 1;
  const cleaned = valStr.trim();
  if (cleaned.endsWith("%")) {
    return Math.max(0, Math.min(1, parseFloat(cleaned) / 100));
  }
  return Math.max(0, Math.min(1, parseFloat(cleaned)));
}

function oklabToRgbStr(l: number, a: number, b: number, alpha: number): string {
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const l_3 = l_ * l_ * l_;
  const m_3 = m_ * m_ * m_;
  const s_3 = s_ * s_ * s_;

  const rLinear = +4.0767416621 * l_3 - 3.3077115913 * m_3 + 0.2309699292 * s_3;
  const gLinear = -1.2684380046 * l_3 + 2.6097574011 * m_3 - 0.3413193965 * s_3;
  const bLinear = -0.0041960863 * l_3 - 0.7034186147 * m_3 + 1.7076147010 * s_3;

  const toByte = (c: number) => {
    if (isNaN(c) || c <= 0) return 0;
    if (c >= 1) return 255;
    const absC = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(255, absC * 255)));
  };

  const r = toByte(rLinear);
  const g = toByte(gLinear);
  const bByte = toByte(bLinear);

  if (alpha < 0.999) {
    return `rgba(${r}, ${g}, ${bByte}, ${parseFloat(alpha.toFixed(3))})`;
  }
  return `rgb(${r}, ${g}, ${bByte})`;
}

export function parseOklch(str: string): string {
  const match = str.match(/oklch\(\s*([0-9.%\-]+)\s+([0-9.%\-]+)\s+([0-9.%\-a-zA-Z]+)(?:\s*\/\s*([0-9.%\-]+))?\s*\)/i);
  if (!match) return str;

  let l = parseFloat(match[1]);
  if (match[1].endsWith("%")) l /= 100;

  let c = parseFloat(match[2]);
  if (match[2].endsWith("%")) c /= 100;

  let h = parseFloat(match[3]);
  if (match[3].toLowerCase().endsWith("deg")) h = parseFloat(match[3]);

  const alpha = parseAlpha(match[4]);

  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  return oklabToRgbStr(l, a, b, alpha);
}

export function parseOklab(str: string): string {
  const match = str.match(/oklab\(\s*([0-9.%\-]+)\s+([0-9.%\-]+)\s+([0-9.%\-]+)(?:\s*\/\s*([0-9.%\-]+))?\s*\)/i);
  if (!match) return str;

  let l = parseFloat(match[1]);
  if (match[1].endsWith("%")) l /= 100;

  let a = parseFloat(match[2]);
  if (match[2].endsWith("%")) a /= 100;

  let b = parseFloat(match[3]);
  if (match[3].endsWith("%")) b /= 100;

  const alpha = parseAlpha(match[4]);

  return oklabToRgbStr(l, a, b, alpha);
}

export const replaceOklch = (cssText: string): string => {
  if (!cssText || typeof cssText !== "string") return cssText;
  if (!cssText.includes("oklch") && !cssText.includes("oklab")) return cssText;

  let result = cssText.replace(/oklch\([^)]+\)/gi, (m) => parseOklch(m));
  result = result.replace(/oklab\([^)]+\)/gi, (m) => parseOklab(m));
  return result;
};

const CSS_COLOR_PROPERTIES = [
  "color",
  "background-color",
  "border-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "box-shadow",
  "fill",
  "stroke",
  "stop-color",
];

export const safeHtml2Canvas = async (
  element: HTMLElement,
  options: Partial<Options> = {}
): Promise<HTMLCanvasElement> => {
  if (!element || !(element instanceof Element || (element as any)?.nodeType === 1)) {
    throw new Error("Invalid element provided as first argument to safeHtml2Canvas");
  }

  const userOnClone = options.onclone;

  const mergedOptions: Partial<Options> = {
    useCORS: true,
    allowTaint: true,
    scale: 2,
    logging: false,
    backgroundColor: "#ffffff",
    ...options,
    onclone: (clonedDoc, clonedElement) => {
      try {
        // Remove outer shadow but preserve/normalize a clean subtle border for exported paper bounds
        if (clonedElement && clonedElement instanceof HTMLElement) {
          clonedElement.style.boxShadow = "none";
          clonedElement.style.border = "none";
          clonedElement.style.outline = "none";
          clonedElement.style.margin = "0";
          clonedElement.style.transform = "none";
        }

        // Hide all no-print and no-export elements during canvas export
        try {
          const noPrintEls = Array.from(clonedDoc.querySelectorAll(".no-print, .no-export"));
          noPrintEls.forEach((el) => {
            (el as HTMLElement).style.setProperty("display", "none", "important");
          });

          // Reveal all print-specific elements in clonedDoc for accurate export
          const printOnlyEls = Array.from(clonedDoc.querySelectorAll(".print-only, [class*='print:inline'], [class*='print:block'], [class*='print:flex']"));
          printOnlyEls.forEach((el) => {
            const htmlEl = el as HTMLElement;
            if (htmlEl.classList.contains("hidden")) {
              htmlEl.classList.remove("hidden");
            }
            if (htmlEl.className.includes("print:inline")) {
              htmlEl.style.setProperty("display", "inline", "important");
            } else if (htmlEl.className.includes("print:block")) {
              htmlEl.style.setProperty("display", "block", "important");
            } else if (htmlEl.className.includes("print:flex")) {
              htmlEl.style.setProperty("display", "flex", "important");
            }
          });
        } catch {
          // ignore
        }

        // Convert base64 signature images to canvas elements to bypass html2canvas image loading & CORS issues
        try {
          const images = Array.from(clonedDoc.querySelectorAll("img"));
          images.forEach((img) => {
            const htmlImg = img as HTMLImageElement;
            const src = htmlImg.src || "";
            if (src.startsWith("data:image/")) {
              const canvas = clonedDoc.createElement("canvas");
              
              // Get actual layout width/height or use natural size as fallback
              const width = htmlImg.offsetWidth || htmlImg.width || 140;
              const height = htmlImg.offsetHeight || htmlImg.height || 36;
              
              // High resolution canvas (2x) for crisp signature output
              canvas.width = width * 2;
              canvas.height = height * 2;
              
              // Apply styling and copy styles from original image
              canvas.className = htmlImg.className;
              canvas.style.cssText = htmlImg.style.cssText;
              canvas.style.width = `${width}px`;
              canvas.style.height = `${height}px`;
              
              const ctx = canvas.getContext("2d");
              if (ctx) {
                // Find matching original image in the source DOM that is already loaded/complete
                const origImages = Array.from(element.querySelectorAll("img"));
                const origImg = origImages.find((oi) => (oi as HTMLImageElement).src === src) as HTMLImageElement | undefined;
                const imgToDraw = origImg || htmlImg;
                
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(imgToDraw, 0, 0, canvas.width, canvas.height);
                
                if (htmlImg.parentNode) {
                  htmlImg.parentNode.replaceChild(canvas, htmlImg);
                }
              }
            } else {
              // Standard image object-fit preservation and html2canvas polyfill using CSS background-image
              const computed = clonedDoc.defaultView?.getComputedStyle(htmlImg) || window.getComputedStyle(htmlImg);
              const objectFit = computed?.objectFit || htmlImg.style.objectFit;
              const objectPosition = computed?.objectPosition || htmlImg.style.objectPosition || "50% 20%";
              
              if (objectFit === "cover") {
                const div = clonedDoc.createElement("div");
                const width = htmlImg.offsetWidth || htmlImg.width;
                const height = htmlImg.offsetHeight || htmlImg.height;
                
                div.className = htmlImg.className;
                div.style.cssText = htmlImg.style.cssText;
                if (width) div.style.width = `${width}px`;
                if (height) div.style.height = `${height}px`;
                div.style.display = "block";
                div.style.backgroundImage = `url("${src}")`;
                div.style.backgroundSize = "cover";
                div.style.backgroundRepeat = "no-repeat";
                div.style.backgroundPosition = objectPosition;
                
                if (htmlImg.parentNode) {
                  htmlImg.parentNode.replaceChild(div, htmlImg);
                }
              } else if (computed) {
                if (computed.objectFit) htmlImg.style.objectFit = computed.objectFit;
                if (computed.objectPosition) htmlImg.style.objectPosition = computed.objectPosition;
              }
            }
          });
        } catch (canvasErr) {
          console.warn("Base64 to canvas conversion in clone failed:", canvasErr);
        }

        // 1. Fix all <style> elements in cloned doc
        const styleElements = Array.from(clonedDoc.querySelectorAll("style"));
        styleElements.forEach((styleEl) => {
          if (styleEl.textContent && (styleEl.textContent.includes("oklch") || styleEl.textContent.includes("oklab"))) {
            styleEl.textContent = replaceOklch(styleEl.textContent);
          }
          if (styleEl.innerHTML && (styleEl.innerHTML.includes("oklch") || styleEl.innerHTML.includes("oklab"))) {
            styleEl.innerHTML = replaceOklch(styleEl.innerHTML);
          }
        });

        // 2. Fix all CSSStyleSheet rules in clonedDoc
        try {
          const sheets = Array.from(clonedDoc.styleSheets);
          for (const sheet of sheets) {
            try {
              const rules = Array.from(sheet.cssRules || sheet.rules || []);
              for (const rule of rules) {
                if (rule instanceof CSSStyleRule && rule.style) {
                  if (rule.style.cssText && (rule.style.cssText.includes("oklch") || rule.style.cssText.includes("oklab"))) {
                    rule.style.cssText = replaceOklch(rule.style.cssText);
                  }
                } else if (rule.cssText && (rule.cssText.includes("oklch") || rule.cssText.includes("oklab"))) {
                  try {
                    (rule as any).cssText = replaceOklch(rule.cssText);
                  } catch {
                    // ignore
                  }
                }
              }
            } catch {
              // Ignore cross-origin stylesheet access restriction
            }
          }
        } catch {
          // ignore
        }

        // 3. Fix inline styles, SVG attributes, and computed styles for all DOM elements
        const allElements = Array.from(clonedDoc.querySelectorAll("*"));
        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement;

          // Inline style cssText
          if (htmlEl.style && htmlEl.style.cssText && (htmlEl.style.cssText.includes("oklch") || htmlEl.style.cssText.includes("oklab"))) {
            htmlEl.style.cssText = replaceOklch(htmlEl.style.cssText);
          }

          // SVG attributes
          ["fill", "stroke", "stop-color", "color"].forEach((attr) => {
            const attrVal = htmlEl.getAttribute?.(attr);
            if (attrVal && (attrVal.includes("oklch") || attrVal.includes("oklab"))) {
              htmlEl.setAttribute(attr, replaceOklch(attrVal));
            }
          });

          // Computed styles: ONLY override properties that actually contain oklch/oklab
          try {
            const computed = clonedDoc.defaultView?.getComputedStyle(htmlEl) || window.getComputedStyle(htmlEl);
            if (computed) {
              for (const prop of CSS_COLOR_PROPERTIES) {
                const val = computed.getPropertyValue(prop);
                if (val && (val.includes("oklch") || val.includes("oklab"))) {
                  const rgbVal = replaceOklch(val);
                  htmlEl.style.setProperty(prop, rgbVal, "important");
                }
              }
            }
          } catch {
            // ignore
          }
        });
      } catch (err) {
        console.warn("oklch replacement in html2canvas failed:", err);
      }

      if (userOnClone) {
        userOnClone(clonedDoc, clonedElement);
      }

      // Automatically maintain exact A4 standard dimensions (794px x 1123px) and remove screen-only borders/shadows
      try {
        const a4Target = (clonedElement.classList.contains("a4-page") ||
          clonedElement.classList.contains("a4-paper") ||
          clonedElement.classList.contains("a4-paper-sheet") ||
          clonedElement.id === "a4-print-area")
            ? clonedElement
            : (clonedElement.querySelector?.(".a4-page, .a4-paper, #a4-print-area, .a4-paper-sheet") as HTMLElement | null);

        if (a4Target) {
          a4Target.style.setProperty("width", "794px", "important");
          a4Target.style.setProperty("min-width", "794px", "important");
          a4Target.style.setProperty("max-width", "794px", "important");
          a4Target.style.setProperty("height", "1123px", "important");
          a4Target.style.setProperty("min-height", "1123px", "important");
          a4Target.style.setProperty("max-height", "1123px", "important");
          a4Target.style.setProperty("transform", "none", "important");
          a4Target.style.setProperty("box-shadow", "none", "important");
          a4Target.style.setProperty("border", "none", "important");
          a4Target.style.setProperty("margin", "0", "important");
          a4Target.style.setProperty("box-sizing", "border-box", "important");
          a4Target.style.setProperty("border-radius", "0", "important");

          if (a4Target.parentElement) {
            a4Target.parentElement.style.setProperty("transform", "none", "important");
            a4Target.parentElement.style.setProperty("width", "794px", "important");
            a4Target.parentElement.style.setProperty("height", "1123px", "important");
            a4Target.parentElement.style.setProperty("margin", "0", "important");
            a4Target.parentElement.style.setProperty("padding", "0", "important");
          }

          // Reset transforms on all ancestor elements in the cloned tree to prevent mobile scaling glitches
          let ancestor = a4Target.parentElement;
          while (ancestor && ancestor !== clonedDoc.body && ancestor !== clonedDoc.documentElement) {
            ancestor.style.setProperty("transform", "none", "important");
            ancestor = ancestor.parentElement;
          }
        }
      } catch (a4Err) {
        console.warn("A4 standard enforcement in clone failed:", a4Err);
      }
    },
  };

  try {
    return await html2canvas(element, mergedOptions);
  } catch (canvasErr) {
    console.warn("Primary html2canvas render warning, retrying with adaptive scale:", canvasErr);
    try {
      return await html2canvas(element, {
        ...mergedOptions,
        scale: 1.5,
      });
    } catch (scale15Err) {
      console.warn("Scale 1.5x fallback failed, retrying at scale 1.0:", scale15Err);
      try {
        return await html2canvas(element, {
          ...mergedOptions,
          scale: 1,
        });
      } catch (fallbackErr) {
        console.error("Fallback html2canvas failed:", fallbackErr);
        throw fallbackErr;
      }
    }
  }
};
