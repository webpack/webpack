const bailouts = {
	publicPath: "string",
	dashed: "dashed",
	cjs: "cjs",
	required: "required",
	lonely: "lonely",
	url: true,
	dup: "dup",
	effect: "lonely effect",
	keys: ["one", "two"],
	context: "context",
	anonymous: "anonymous",
	anonymousName: "default",
	load: "function"
};

it("should run pages whose shared modules are linked across chunks", async () => {
	const a = await import(/* webpackChunkName: "page-a" */ "./page-a.js");
	const b = await import(/* webpackChunkName: "page-b" */ "./page-b.js");
	expect(a.run()).toEqual({ html: "[<a>X</a>]", count: 1, ...bailouts });
	// `count` is a live binding both pages share
	expect(b.run()).toEqual({
		html: "[<b>RANK: 5</b>]",
		count: 2,
		...bailouts,
		registry: { evaluated: 1, keys: ["one", "two"], context: "context", label: "n: 1" }
	});
	expect(globalThis.crossChunkImportsEffectRuns).toBe(1);
});

it("should hoist the linkable shared modules into one scope with native exports", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const read = (file) =>
		fs.readFileSync(path.join(__dirname, "chunks", file), "utf-8");
	const shared = read("shared.chunk.mjs");
	// the registry's export declaration ends the first `};` line
	const parts = shared.split(/^\};$/m);
	expect(parts).toHaveLength(2);
	const [registry, scope] = parts;

	// component, private, util and counter are hoisted; private is never exported
	for (const declaration of [
		"const formatValue = ",
		"const bracket = ",
		"function wrap(",
		"let count = 0;",
		// what effect.js and the registry's url.js import
		"const lonely = () => ",
		// effect.js runs where its importer imports it, in an init function
		"globalThis.crossChunkImportsEffectRuns",
		// an anonymous default function is named without the runtime's `.dn`
		'"name", { value: "default", configurable: true });',
		// namespace importers bind an inline namespace object
		"const one = 1;",
		"return this.value;",
		'[Symbol.toStringTag]: { value: "Module" },'
	]) {
		expect(scope).toContain(declaration);
	}
	// the scope runs at the chunk's top level, where the runtime is unbound
	expect(scope).not.toContain("__webpack_require__");
	const exportMatch = /^export \{ .* \};$/m.exec(scope);
	expect(exportMatch).not.toBeNull();
	const [exported] = /** @type {RegExpExecArray} */ (exportMatch);
	expect(exported).not.toMatch(/\bbracket as /);
	expect(exported).toMatch(/\bcount as \$\d/);
	// effect.js's importer calls its init function
	expect(exported).toMatch(/\beffect_init as _\$\d/);

	// each bailout keeps its module in the registry
	for (const bailout of [
		"typeof __webpack_require__.p",
		"const dashed = () => ",
		"module.exports = {",
		"const required = () => ",
		"new URL("
	]) {
		expect(registry).toContain(bailout);
	}

	expect(shared).not.toContain("__webpack_require__.dn(");
	// a registry module binds a scope of its own chunk through a self-import
	expect(shared.split("\n")[0]).toMatch(
		/^import \{ \$\d+\w+ as __webpack_linked_\S+ \} from "\.\/shared\.chunk\.mjs";$/
	);

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
			// a linked export, or an init function under `_$`
			expect(specifier).toMatch(/^_?\$\d/);
			expect(specifier).toContain(" as __webpack_linked_");
		}
	}
});

it("should report why each module another chunk imports stays in the registry", () => {
	/** @type {Record<string, string[]>} */
	const reasons = {};
	/**
	 * Collects the cross-chunk bailouts of the modules and the modules they concatenate.
	 * @param {import("../../../../types").StatsModule[]} modules the modules
	 */
	const collect = (modules) => {
		for (const module of modules) {
			const bailouts = (module.optimizationBailout || []).filter((reason) =>
				reason.startsWith("Cross-chunk imports bailout: ")
			);
			if (bailouts.length > 0) reasons[module.name] = bailouts;
			if (module.modules) collect(module.modules);
		}
	};
	collect(__STATS__.modules);
	const prefix = "Cross-chunk imports bailout: ";
	expect(reasons).toEqual({
		"./shared/public-path.js": [`${prefix}module uses the webpack runtime`],
		"./shared/string-name.js": [
			`${prefix}export "with-dash" is not an identifier`
		],
		"./shared/cjs.js": [`${prefix}Module is not an ECMAScript module`],
		"./shared/required.js": [
			`${prefix}./shared/cjs.js imports it through cjs full require`
		],
		"./shared/url.js": [`${prefix}new URL() needs the module registry`],
		"./shared/loader.js": [`${prefix}module has async blocks`]
	});
});
