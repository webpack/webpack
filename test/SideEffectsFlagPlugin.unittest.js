"use strict";

const SideEffectsFlagPlugin = require("../lib/optimize/SideEffectsFlagPlugin");

describe("SideEffectsFlagPlugin", () => {
	it("should assume true", () => {
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./foo/bar.js",
				undefined,
				new Map()
			)
		).toBe(true);
	});

	it("should understand boolean values", () => {
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./foo/bar.js",
				true,
				new Map()
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./foo/bar.js",
				false,
				new Map()
			)
		).toBe(false);
	});

	it("should understand a glob", () => {
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"./src/**/*.js",
				new Map()
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./x.js",
				"./src/**/*.js",
				new Map()
			)
		).toBe(false);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"./**/src/x/y/z.js",
				new Map()
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"**.js",
				new Map()
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"./src/**/z.js",
				new Map()
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"./**/x/**/z.js",
				new Map()
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"./**/src/**",
				new Map()
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"./**/src/*",
				new Map()
			)
		).toBe(false);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"*.js",
				new Map()
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"x/**/z.js",
				new Map()
			)
		).toBe(false);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"src/**/z.js",
				new Map()
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"src/**/{x,y,z}.js",
				new Map()
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"src/**/[x-z].js",
				new Map()
			)
		).toBe(true);
	});

	it("should understand arrays", () => {
		const array = ["./src/**/*.js", "./dirty.js"];
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				array,
				new Map()
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects("./dirty.js", array, new Map())
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects("./clean.js", array, new Map())
		).toBe(false);
	});
});
