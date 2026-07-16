import * as circularA from "./circular-a";
import * as exportRequire from "./export-require";
import * as moduleId from "./module-id";
import reexportRequire from "./reexport-require";
import "./side-effect-only";
import * as sloppy from "./sloppy";
import * as wrapWithRequire from "./wrap-with-require";

it("should keep unsupported CommonJS modules working", () => {
	expect(sloppy.s).toBe("sloppy");
	expect(typeof moduleId.id).not.toBe("undefined");
	expect(exportRequire.inner.s).toBe("sloppy");
	expect(wrapWithRequire.default.s).toBe("sloppy");
	expect(globalThis.__webpackWrappedSideEffect).toBe("ran");
});

it("should keep a whole `module.exports = require(...)` re-export working", () => {
	expect(reexportRequire.s).toBe("sloppy");
});

it("should keep circular CommonJS requires working", () => {
	expect(circularA.name).toBe("a");
	expect(circularA.bName).toBe("b");
});

it("should not concatenate any of the unsupported modules", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(0);
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
	expect(bailoutsOf("export-require.js")).toContainEqual(
		expect.stringContaining("unsupported dependency")
	);
	expect(bailoutsOf("wrap-with-require.js")).toContainEqual(
		expect.stringContaining("not supported when wrapping")
	);
	expect(bailoutsOf("side-effect-only.js")).toContainEqual(
		expect.stringContaining("not an ECMAScript module")
	);
});
