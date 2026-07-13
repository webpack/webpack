const fs = require("fs");
const path = require("path");

const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
const head = page.slice(0, page.indexOf("</head>"));

it("should evaluate a resourceHints function with the page context", () => {
	// The function keyed off `entryName` ("page") and read `defaultHints`.
	expect(head).toContain('<link rel="preload" as="image" href="/hero-page.jpg">');
	expect(head).toContain('<link rel="prefetch" as="script" href="settings.js">');
});

it("should still emit the auto initial-graph preload alongside custom hints", () => {
	expect(head).toContain('<link rel="preload" as="script" href="runtime.js">');
});
