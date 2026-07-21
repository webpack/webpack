const fs = require("fs");
const path = require("path");

it("should write output.resourceHints.manifest as a JSON asset", () => {
	const manifest = JSON.parse(
		fs.readFileSync(path.resolve(__dirname, "ssr-hints.json"), "utf-8")
	);
	expect(Array.isArray(manifest.home)).toBe(true);

	// The URL asset (inter.woff2) is preloaded via the parser rule.
	expect(manifest.home).toContainEqual(
		expect.objectContaining({
			rel: "preload",
			as: "font",
			href: "https://cdn.example.com/inter.woff2"
		})
	);

	// The runtime sibling got the auto initial-graph preload (classic → as=script).
	expect(manifest.home).toContainEqual(
		expect.objectContaining({
			rel: "preload",
			as: "script",
			href: expect.stringMatching(/runtime/)
		})
	);
});
