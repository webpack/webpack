const fs = require("fs");
const path = require("path");

const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
const head = page.slice(0, page.indexOf("</head>"));

it("should emit fetchpriority on auto initial-graph modulepreload hints", () => {
	// Parser-inserted hints are the one place a `fetchpriority` on a
	// `<link rel="modulepreload">` is honored — browsers ignore the attribute on
	// links injected at runtime, so webpack only emits it here.
	const tag = head.match(/<link rel="modulepreload"[^>]*>/)[0];

	expect(tag).toContain('href="runtime.mjs"');
	expect(tag).toContain('fetchpriority="high"');
});
