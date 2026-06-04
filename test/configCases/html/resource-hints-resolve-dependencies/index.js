const font = new URL(/* webpackPreload: true */ "./font.woff2", import.meta.url);
const img = new URL(/* webpackPrefetch: true */ "./image.png", import.meta.url);
console.log(font.href, img.href);
