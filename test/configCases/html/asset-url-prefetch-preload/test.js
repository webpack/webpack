const fs = require("fs");
const path = require("path");

const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");

it("should emit URL asset hints as <link> in the HTML head", () => {
	// `webpackPreload` on the woff2 becomes a `<link rel="preload" as="font">`.
	expect(page).toMatch(
		/<link rel="preload" as="font" href="[^"]*font\.woff2"[^>]*>/
	);
	// `output.resourceHints.assets` rule promotes PNGs to `prefetch` with `low`.
	expect(page).toMatch(
		/<link rel="prefetch" as="image" href="[^"]*image\.png"[^>]*fetchpriority="low"[^>]*>/
	);
});

it("should place the asset hints inside <head>", () => {
	const headEnd = page.indexOf("</head>");
	expect(headEnd).toBeGreaterThan(-1);
	const re = /<link rel="(?:preload|prefetch)"[^>]*>/g;
	let m;
	while ((m = re.exec(page))) {
		expect(m.index).toBeLessThan(headEnd);
	}
});

it("should surface the same hints in stats.entrypoints[name].resourceHints", () => {
	const stats = JSON.parse(
		fs.readFileSync(path.resolve(__dirname, "stats.json"), "utf-8")
	);
	// The HTML parser creates a synthetic `__html_<hash>_<index>` entry per
	// `<script>` tag; the assets referenced from that script land under it.
	const [, htmlScriptEntry] = Object.entries(stats.entrypoints).find(
		([name]) => name.startsWith("__html_")
	);
	const hints = htmlScriptEntry.resourceHints;
	expect(Array.isArray(hints)).toBe(true);
	// The magic-commented woff2 is preloaded as font.
	expect(hints).toContainEqual(
		expect.objectContaining({ rel: "preload", as: "font", href: "font.woff2" })
	);
	// The rule-matched png is prefetched with fetchPriority=low.
	expect(hints).toContainEqual(
		expect.objectContaining({
			rel: "prefetch",
			as: "image",
			href: "image.png",
			fetchPriority: "low"
		})
	);
});
