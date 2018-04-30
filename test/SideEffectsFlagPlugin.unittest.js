"use strict";

const SideEffectsFlagPlugin = require("../lib/optimize/SideEffectsFlagPlugin");

describe("SideEffectsFlagPlugin", () => {
	it("should assume true", () => {
		SideEffectsFlagPlugin.moduleHasSideEffects(
			"./foo/bar.js",
			undefined
		).should.eql(true);
	});

	it("should understand boolean values", () => {
		SideEffectsFlagPlugin.moduleHasSideEffects("./foo/bar.js", true).should.eql(
			true
		);
		SideEffectsFlagPlugin.moduleHasSideEffects(
			"./foo/bar.js",
			false
		).should.eql(false);
	});

	it("should understand a glob", () => {
		SideEffectsFlagPlugin.moduleHasSideEffects(
			"./src/x/y/z.js",
			"./src/**/*.js"
		).should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects(
			"./x.js",
			"./src/**/*.js"
		).should.eql(false);
		SideEffectsFlagPlugin.moduleHasSideEffects(
			"./src/x/y/z.js",
			"./**/src/x/y/z.js"
		).should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects(
			"./src/x/y/z.js",
			"**.js"
		).should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects(
			"./src/x/y/z.js",
			"./src/**/z.js"
		).should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects(
			"./src/x/y/z.js",
			"./**/x/**/z.js"
		).should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects(
			"./src/x/y/z.js",
			"./**/src/**"
		).should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects(
			"./src/x/y/z.js",
			"./**/src/*"
		).should.eql(false);
		SideEffectsFlagPlugin.moduleHasSideEffects(
			"./src/x/y/z.js",
			"*.js"
		).should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects(
			"./src/x/y/z.js",
			"x/**/z.js"
		).should.eql(false);
		SideEffectsFlagPlugin.moduleHasSideEffects(
			"./src/x/y/z.js",
			"src/**/z.js"
		).should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects(
			"./src/x/y/z.js",
			"src/**/{x,y,z}.js"
		).should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects(
			"./src/x/y/z.js",
			"src/**/[x-z].js"
		).should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects(
			"./src/x/y/z.js",
			"src/**/[[:lower:]].js"
		).should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects(
			"./src/x/y/z.js",
			"!*.js"
		).should.eql(false);
		SideEffectsFlagPlugin.moduleHasSideEffects(
			"./src/x/y/z.js",
			"!**/*.js"
		).should.eql(false);
	});

	it("should understand arrays", () => {
		const array = ["./src/**/*.js", "./dirty.js"];
		SideEffectsFlagPlugin.moduleHasSideEffects(
			"./src/x/y/z.js",
			array
		).should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects("./dirty.js", array).should.eql(
			true
		);
		SideEffectsFlagPlugin.moduleHasSideEffects("./clean.js", array).should.eql(
			false
		);
	});
});
