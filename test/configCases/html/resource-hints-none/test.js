const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");
const page = read("page.html");
const head = page.slice(0, page.indexOf("</head>"));

it("should emit no resource-hint <link> in <head> with resourceHints: none", () => {
	expect(head).not.toMatch(/<link rel="preload"/);
	expect(head).not.toMatch(/<link rel="prefetch"/);
	expect(head).not.toMatch(/<link rel="modulepreload"/);
	// The auto initial-graph runtime sibling is not preloaded either.
	expect(head).not.toContain("runtime.js");
});

it("should not emit the JS startup asset-hint runtime", () => {
	// No preload/prefetch helper calls injected into any chunk.
	const runtime = read("runtime.js");
	expect(runtime).not.toMatch(/\.(PA|LA)\(/);
});
