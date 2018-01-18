"use strict";

require("should");
const SideEffectsFlagPlugin = require("../lib/optimize/SideEffectsFlagPlugin");

describe("SideEffectsFlagPlugin", () => {
	it("should understand boolean values", () => {
		SideEffectsFlagPlugin.moduleHasSideEffects("./foo/bar.js", true).should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects("./foo/bar.js", false).should.eql(false);
	});

	it("should understand boolean-ish values", () => {
		SideEffectsFlagPlugin.moduleHasSideEffects("./foo/bar.js", "true").should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects("./foo/bar.js", "false").should.eql(false);
		SideEffectsFlagPlugin.moduleHasSideEffects("./false.js", "false").should.eql(true);
	});

	it("should understand module name values", () => {
		SideEffectsFlagPlugin.moduleHasSideEffects("./x.js", "./x.js").should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects("./y.js", "./x.js").should.eql(false);
		SideEffectsFlagPlugin.moduleHasSideEffects("./x.js", "x").should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects("./src/x.js", "x").should.eql(true);
	});

	it("should understand a glob", () => {
		SideEffectsFlagPlugin.moduleHasSideEffects("./src/x/y/z.js", "./src/**/*.js").should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects("./x.js", "./src/**/*.js").should.eql(false);
	});

	it("should understand a RegExp", () => {
		SideEffectsFlagPlugin.moduleHasSideEffects("./src/x/y/z.js", "src\\/.*\\.js$").should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects("./z.js", "src\\/.*\\.js$").should.eql(false);
	});

	it("should understand objects", () => {
		const obj = {
			"./x.js": true,
			"./y.js": false,
			"./z.js": "true",
			"./a.js": "false",
		};
		SideEffectsFlagPlugin.moduleHasSideEffects("./x.js", obj).should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects("./y.js", obj).should.eql(false);
		SideEffectsFlagPlugin.moduleHasSideEffects("./z.js", obj).should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects("./a.js", obj).should.eql(false);
		SideEffectsFlagPlugin.moduleHasSideEffects("./b.js", obj).should.eql(false);
	});

	it("should understand arrays", () => {
		const array = [
			"./src/**/*.js",
			{
				"./dirty.js": true,
				"./clean.js": "false",
			},
		];
		SideEffectsFlagPlugin.moduleHasSideEffects("./src/x/y/z.js", array).should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects("./dirty.js", array).should.eql(true);
		SideEffectsFlagPlugin.moduleHasSideEffects("./clean.js", array).should.eql(false);
	});
});
