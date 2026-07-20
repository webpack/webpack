// Entry chunk URL asset — should end up preloaded in <head>.
const font = new URL(/* webpackPreload: true */ "./font.woff2", import.meta.url);

// Vendor-chunk URL asset (via a dedicated module split off by splitChunks).
import { hero } from "./vendor.js";
console.log(font.href, hero.href);
