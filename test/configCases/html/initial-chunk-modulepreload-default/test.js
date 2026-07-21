const fs = require("fs");
const path = require("path");

const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
const head = page.slice(0, page.indexOf("</head>"));

it("should default modulepreload on for ESM output without resourceHints set", () => {
	// The runtime sibling chunk is preloaded automatically (Vite-style ESM default).
	expect(head).toContain('<link rel="modulepreload" href="runtime.mjs">');
});
