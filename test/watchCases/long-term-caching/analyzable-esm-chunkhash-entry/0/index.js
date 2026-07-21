it("should re-hash the [chunkhash] entry and keep a fresh baked reference", () => {
	const fs = require("fs");
	const path = require("path");
	const entry = STATS_JSON.assetsByChunkName.main.find((n) =>
		/^main\..+\.mjs$/.test(n)
	);
	const bundle = fs.readFileSync(path.join(__dirname, entry), "utf8");
	const match = /"\.\/(dynamic\.[0-9a-f]+\.mjs)"/.exec(bundle);
	expect(match).not.toBe(null);
	// The referenced chunk file the entry names must exist in this build's output.
	expect(fs.existsSync(path.join(__dirname, match[1]))).toBe(true);
	expect(bundle).toContain(`${"__webpack_require__"}.ei(`);
});

export const load = () => import(/* webpackChunkName: "dynamic" */ "./dynamic");
