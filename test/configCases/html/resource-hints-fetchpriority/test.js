const fs = require("fs");
const path = require("path");

const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
const head = page.slice(0, page.indexOf("</head>"));

it("should emit fetchpriority on a preload href descriptor", () => {
	const tag = head.match(/<link rel="preload"[^>]*href="\/fonts\/inter\.woff2"[^>]*>/)[0];
	expect(tag).toContain('fetchpriority="high"');
});

it("should emit fetchpriority on a prefetch entry-ref descriptor", () => {
	// `prefetch` chunk hints now carry fetchpriority too (spec draft allows it).
	const tags = head.match(/<link rel="prefetch"[^>]*>/g);
	expect(tags.length).toBeGreaterThan(0);
	for (const tag of tags) {
		expect(tag).toContain('fetchpriority="low"');
	}
});
