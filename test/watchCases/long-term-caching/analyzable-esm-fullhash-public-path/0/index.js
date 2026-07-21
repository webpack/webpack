it("should bake a fresh full hash into the analyzable specifier each rebuild", () => {
	// The full hash changes every rebuild (dynamic.js changes below). The consuming
	// chunk's source is only a placeholder, so without the full-hash marker its cached
	// asset would keep a stale hash. Assert the baked hash equals the current build's.
	const fs = require("fs");
	const path = require("path");
	const bundle = fs.readFileSync(
		path.join(__dirname, "bundle.mjs"),
		"utf8"
	);
	const match = /cdn\.example\.com\/([0-9a-f]+)\/dynamic\.mjs/.exec(bundle);
	expect(match).not.toBe(null);
	expect(match[1]).toBe(STATS_JSON.hash);
});

export const load = () => import(/* webpackChunkName: "dynamic" */ "./dynamic");
