// colours are packed ABGR Uint32 values, as the 2D frame buffer stores them
export const C = h => { const n = parseInt(h.slice(1), 16); return ((255 << 24) | ((n & 255) << 16) | (n & 0xff00) | (n >> 16 & 255)) >>> 0; };
// darken (k < 1) or brighten a packed colour, keeping its alpha
export const eShade = (c, k) => ((c & 0xff000000) | (Math.round((c >> 16 & 255) * k) << 16) | (Math.round((c >> 8 & 255) * k) << 8) | Math.round((c & 255) * k)) >>> 0;
