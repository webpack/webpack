// URL asset with `webpackPreload` — comment wins over the `assets` rule and
// gets a `<link rel="preload">` injected into the HTML head at build time.
const font = new URL(/* webpackPreload: true */ "./font.woff2", import.meta.url);
// URL asset that only matches the `output.resourceHints.assets` rule (prefetch
// for PNGs). Also emitted as a `<link rel="prefetch">` in the head.
const img = new URL("./image.png", import.meta.url);
console.log(font.href, img.href);
