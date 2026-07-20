const fs = require("fs");
const path = require("path");

it("should surface auto-graph + URL-asset hints in stats for JS-only entry", () => {
	const stats = JSON.parse(
		fs.readFileSync(path.resolve(__dirname, "stats.json"), "utf-8")
	);
	const hints = stats.entrypoints.home.resourceHints;
	expect(Array.isArray(hints)).toBe(true);

	// The URL asset (inter.woff2) is preloaded via the parser rule.
	expect(hints).toContainEqual(
		expect.objectContaining({
			rel: "preload",
			as: "font",
			href: "https://cdn.example.com/inter.woff2",
			fetchPriority: "high"
		})
	);

	// The callback ran with hostType: "js" and stamped a marker.
	expect(hints).toContainEqual(
		expect.objectContaining({
			rel: "preload",
			as: "fetch",
			href: "https://cdn.example.com/marker-home-js"
		})
	);

	// The runtime chunk got the auto-graph preload (classic output → as="script").
	expect(hints).toContainEqual(
		expect.objectContaining({
			rel: "preload",
			as: "script",
			href: expect.stringMatching(/runtime\.chunk\.js|runtime\.js/)
		})
	);
});
