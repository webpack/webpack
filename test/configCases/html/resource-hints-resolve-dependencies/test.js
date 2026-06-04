const fs = require("fs");
const path = require("path");

it("resolveDependencies rewrites and filters the entrypoint's stats.resourceHints", () => {
	const stats = JSON.parse(
		fs.readFileSync(path.resolve(__dirname, "stats.json"), "utf-8")
	);
	const [entryName, entry] = Object.entries(stats.entrypoints).find(
		([name]) => name.startsWith("__html_")
	);
	const hints = entry.resourceHints;

	// The font hint: kept and rewritten to the CDN.
	expect(hints).toContainEqual(
		expect.objectContaining({
			rel: "preload",
			href: "https://cdn.example.com/font.woff2",
			as: "font"
		})
	);
	// The image hint: filtered out.
	expect(hints).not.toContainEqual(
		expect.objectContaining({ href: expect.stringMatching(/image\.png$/) })
	);
	// The synthetic entry-name / hostType marker the hook pushed on.
	expect(hints).toContainEqual({
		rel: "preload",
		href: `https://cdn.example.com/marker-${entryName}-html`,
		as: "fetch"
	});
});
