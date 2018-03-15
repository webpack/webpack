"use strict";

const should = require("should");
const WebpackOptionsDefaulter = require("../lib/WebpackOptionsDefaulter");

describe("WebpackOptionsDefaulter", () => {
	let plugin;

	beforeEach(() => (plugin = new WebpackOptionsDefaulter()));

	describe("resolve.mainFields", () => {
		it("sets the right fields for web target in dev mode", () => {
			const options = plugin.process({
				mode: "development",
				target: "web"
			});

			should(options.resolve.mainFields).be.eql(["browser", "module", "main"]);
		});

		it("sets the right fields for web target in prod mode", () => {
			const options = plugin.process({
				mode: "production",
				target: "web"
			});

			should(options.resolve.mainFields).be.eql([
				"browser:production",
				"browser",
				"module:production",
				"module",
				"main:production",
				"main"
			]);
		});

		it("sets the right fields for non-web target in dev mode", () => {
			const options = plugin.process({
				mode: "development",
				target: "node"
			});

			should(options.resolve.mainFields).be.eql(["module", "main"]);
		});

		it("sets the right fields for non-web target in prod mode", () => {
			const options = plugin.process({
				mode: "production",
				target: "node"
			});

			should(options.resolve.mainFields).be.eql([
				"module:production",
				"module",
				"main:production",
				"main"
			]);
		});
	});
});
