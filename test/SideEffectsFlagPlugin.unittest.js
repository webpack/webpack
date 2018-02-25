"use strict";

const SideEffectsFlagPlugin = require("../lib/optimize/SideEffectsFlagPlugin");

describe("SideEffectsFlagPlugin", () => {
	it("should assume true", () => {
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects("./foo/bar.js", undefined)
		).toBe(true);
	});

	it("should understand boolean values", () => {
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects("./foo/bar.js", true)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects("./foo/bar.js", false)
		).toBe(false);
	});

	it("should understand a glob", () => {
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"./src/**/*.js"
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects("./x.js", "./src/**/*.js")
		).toBe(false);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"./**/src/x/y/z.js"
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects("./src/x/y/z.js", "**.js")
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"./src/**/z.js"
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"./**/x/**/z.js"
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"./**/src/**"
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects("./src/x/y/z.js", "./**/src/*")
		).toBe(false);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects("./src/x/y/z.js", "*.js")
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects("./src/x/y/z.js", "x/**/z.js")
		).toBe(false);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"src/**/z.js"
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"src/**/{x,y,z}.js"
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"src/**/[x-z].js"
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects(
				"./src/x/y/z.js",
				"src/**/[[:lower:]].js"
			)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects("./src/x/y/z.js", "!*.js")
		).toBe(false);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects("./src/x/y/z.js", "!**/*.js")
		).toBe(false);
	});

	it("should understand arrays", () => {
		const array = ["./src/**/*.js", "./dirty.js"];
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects("./src/x/y/z.js", array)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects("./dirty.js", array)
		).toBe(true);
		expect(
			SideEffectsFlagPlugin.moduleHasSideEffects("./clean.js", array)
		).toBe(false);
	});
});
