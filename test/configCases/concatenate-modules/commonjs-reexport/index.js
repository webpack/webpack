import * as exportRequire from "./export-require";
import { bump, count, v } from "./esm-reexport";

it("should keep an `exports.x = require()` alias working when concatenated", () => {
	expect(exportRequire.inner.v).toBe("target");
	expect(exportRequire.tag).toBe("export-require");
	// the alias resolves `inner` straight to ./target, so this is what proves the
	// module body really ran
	expect(global.__ran).toContain("export-require");
});

it("should read an ESM re-export of a wrapped CommonJS module", () => {
	expect(v).toBe("wrapped");
	expect(global.__ran).toContain("wrapped");
});

it("should re-export the default of a dynamic CommonJS module from a wrapped module", () => {
	const wrappedReexport = require("./wrapped-reexport");
	expect(wrappedReexport.dynamicDefault.v).toBe("dynamic");
});

it("should keep the re-exported binding live", () => {
	expect(count).toBe(0);
	expect(bump()).toBe(1);
	expect(count).toBe(1);
});

it("should concatenate only the re-export chain", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	expect(concatModules[0].modules.map((m) => m.name).sort()).toEqual([
		"./dynamic-exports.js",
		"./esm-reexport.js",
		"./export-require.js",
		"./index.js",
		"./target.js",
		"./wrapped-reexport.js",
		"./wrapped.js"
	]);
	delete global.__ran;
});
