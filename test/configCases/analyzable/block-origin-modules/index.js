const fs = require("fs");
const path = require("path");

it("should load a require.ensure block", (done) => {
	require.ensure(
		["./lazy"],
		() => {
			expect(require("./lazy")).toBe("lazy");
			done();
		},
		"ensured"
	);
});

it("should load an AMD require block", (done) => {
	require(["./amd"], (amd) => {
		expect(amd).toBe("amd");
		done();
	});
});

it("should load a lazy-once context", async () => {
	const load = (name) => import(/* webpackMode: "lazy-once" */ `./ctx/${name}`);

	await expect(load("a")).resolves.toEqual(
		expect.objectContaining({ default: "a" })
	);
	await expect(load("b")).resolves.toEqual(
		expect.objectContaining({ default: "b" })
	);
});

it("should bake the import even though the block names no module of its own", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	const analyzableImport = `${"__webpack_require__"}.ei(`;
	const ensureChunkCall = `${"__webpack_require__"}.e(`;

	// One per emitter: `require.ensure`, AMD `require([...])` and the lazy-once context.
	expect(bundle.split(analyzableImport)).toHaveLength(4);
	expect(bundle).not.toContain(ensureChunkCall);
});
