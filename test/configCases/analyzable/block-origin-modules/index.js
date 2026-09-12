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
	const importMap = `${"chunkImports"} = {`;
	const start = bundle.indexOf(importMap);

	expect(start).not.toBe(-1);
	const region = bundle.slice(start, bundle.indexOf("};", start));

	// One per emitter: `require.ensure`, AMD `require([...])` and the lazy-once context.
	for (const name of ["ensured", "amd_js", "ctx"]) {
		expect([name, region.includes(name)]).toEqual([name, true]);
	}
	expect(bundle).toContain(`${"__webpack_require__"}.e(`);
});
