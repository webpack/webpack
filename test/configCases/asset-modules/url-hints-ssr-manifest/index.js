// URL asset — the `parser.javascript.urlHints` rule promotes it to preload.
const font = new URL("./inter.woff2", import.meta.url);
console.log(font.href);
