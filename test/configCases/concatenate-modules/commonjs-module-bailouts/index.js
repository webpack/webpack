import * as circularA from "./circular-a";
import * as exportRequire from "./export-require";
import * as moduleId from "./module-id";
import * as moduleLoaded from "./module-loaded";
import reexportRequire from "./reexport-require";
import * as requireCache from "./require-cache";
import * as requireMain from "./require-main";
import "./side-effect-only";
import * as sloppy from "./sloppy";
import * as wrapWithRequire from "./wrap-with-require";

it("should keep modules with unsupported export shapes working", () => {
	expect(sloppy.s).toBe("sloppy");
	expect(typeof moduleId.id).not.toBe("undefined");
	expect(exportRequire.inner.s).toBe("sloppy");
	expect(wrapWithRequire.default.s).toBe("sloppy");
	expect(global.__webpackWrappedSideEffect).toBe("ran");
});

it("should keep modules reading the module cache working", () => {
	expect(requireCache.cached).toBe(true);
	expect(requireMain.hasMain).toBe(true);
	expect(moduleLoaded.loaded).toBe(false);
});

it("should keep a whole `module.exports = require(...)` re-export working", () => {
	expect(reexportRequire.s).toBe("sloppy");
});

it("should keep circular CommonJS requires working", () => {
	expect(circularA.name).toBe("a");
	expect(circularA.bName).toBe("b");
});

it("should concatenate only the supported modules", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	const inner = concatModules[0].modules.map((m) => m.name).sort();
	expect(inner).toEqual([
		"./circular-a.js",
		"./circular-b.js",
		"./export-require.js",
		"./index.js",
		"./reexport-require.js",
		"./side-effect-only.js",
		"./wrap-with-require.js"
	]);
});

it("should report a bailout reason for each unsupported module", () => {
	/**
	 * @param {string} name module name
	 * @returns {string[]} optimization bailout messages
	 */
	const bailoutsOf = (name) => {
		const module = __STATS__.modules.find((m) => m.name === `./${name}`);
		expect(module).toBeDefined();
		return module.optimizationBailout || [];
	};
	expect(bailoutsOf("sloppy.js")).toContainEqual(
		expect.stringContaining("not in strict mode")
	);
	expect(bailoutsOf("module-id.js")).toContainEqual(
		expect.stringContaining("module.id")
	);
	expect(bailoutsOf("module-loaded.js")).toContainEqual(
		expect.stringContaining("module.loaded")
	);
	// runtime requirements reachable only through presentational dependencies
	expect(bailoutsOf("require-cache.js")).toContainEqual(
		expect.stringContaining("__webpack_require__.c")
	);
	expect(bailoutsOf("require-main.js")).toContainEqual(
		expect.stringContaining("__webpack_require__.c")
	);
	delete global.__webpackWrappedSideEffect;
});
