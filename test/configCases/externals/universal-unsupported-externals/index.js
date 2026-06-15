"use strict";

it("does not support require-based externals in a universal ESM target", () => {
	// the commonjs family emits `require(...)`, but `require` is not defined in ESM output
	expect(() => require("commonjsExt")).toThrow(/require is not defined/);
	expect(() => require("commonjs2Ext")).toThrow(/require is not defined/);
	expect(() => require("commonjsModuleExt")).toThrow(/require is not defined/);
	expect(() => require("commonjsStaticExt")).toThrow(/require is not defined/);
	// `this` external: top-level `this` is undefined in an ESM module
	expect(() => require("thisExt")).toThrow(/Cannot read properties of undefined/);
});
