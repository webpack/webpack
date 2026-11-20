const bailouts = {
	publicPath: "string",
	dashed: "dashed",
	cjs: "cjs",
	required: "required",
	lonely: "lonely",
	url: true,
	dup: "dup",
	effect: "lonely effect",
	keys: ["one", "two"]
};

it("should run pages whose shared modules are linked across chunks", async () => {
	const a = await import(/* webpackChunkName: "page-a" */ "./page-a.js");
	const b = await import(/* webpackChunkName: "page-b" */ "./page-b.js");
	expect(a.run()).toEqual({ html: "[<a>X</a>]", count: 1, ...bailouts });
	// `count` is a live binding both pages share
	expect(b.run()).toEqual({ html: "[<b>RANK: 5</b>]", count: 2, ...bailouts });
	expect(globalThis.crossChunkImportsEffectRuns).toBe(1);
});

it("should hoist the linkable shared modules into one scope with native exports", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const read = (file) =>
		fs.readFileSync(path.join(__dirname, "chunks", file), "utf-8");
	const shared = read("shared.chunk.mjs");
	const [registry, scope] = shared.split(/^\};$/m);

	// component, private, util and counter are hoisted; private is never exported
	for (const declaration of [
		"const formatValue = ",
		"const bracket = ",
		"function wrap(",
		"let count = 0;"
	]) {
		expect(scope).toContain(declaration);
	}
	const [exported] = /^export \{ .* \};$/m.exec(scope);
	expect(exported).not.toMatch(/\bbracket as /);
	expect(exported).toMatch(/\bcount as \$\d/);

	// each bailout keeps its module in the registry
	for (const bailout of [
		"globalThis.crossChunkImportsEffectRuns",
		"const one = 1;",
		"typeof __webpack_require__.p",
		"const dashed = () => ",
		"module.exports = {",
		"const required = () => ",
		"const lonely = () => ",
		"new URL("
	]) {
		expect(registry).toContain(bailout);
	}

	// a module in both pages' chunks stays in each
	expect(shared).not.toContain("dup");
	for (const page of ["page-a.chunk.mjs", "page-b.chunk.mjs"]) {
		expect(read(page)).toContain('const dup = () => "dup";');
		const imports = read(page)
			.split("\n")
			.filter((line) => line.endsWith(' } from "./shared.chunk.mjs";'));
		expect(imports).toHaveLength(1);
		for (const specifier of imports[0]
			.slice("import { ".length, -' } from "./shared.chunk.mjs";'.length)
			.split(", ")) {
			expect(specifier).toMatch(/^\$\d/);
			expect(specifier).toContain(" as __webpack_linked_");
		}
	}
});
