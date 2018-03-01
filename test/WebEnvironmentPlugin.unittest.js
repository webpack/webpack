"use strict";

const should = require("should");
const WebEnvironmentPlugin = require("../lib/web/WebEnvironmentPlugin");

describe("WebEnvironmentPlugin", () => {
	let WebEnvironmentPluginInstance;

	before(
		() =>
			(WebEnvironmentPluginInstance = new WebEnvironmentPlugin(
				"inputFileSystem",
				"outputFileSystem"
			))
	);

	describe("apply", () => {
		let compileSpy;
		before(() => {
			compileSpy = {
				outputFileSystem: "otherOutputFileSystem"
			};
			WebEnvironmentPluginInstance.apply(compileSpy);
		});

		it("should set compiler.outputFileSystem information with the same as set in WebEnvironmentPlugin", () =>
			should(compileSpy.outputFileSystem).be.eql(
				WebEnvironmentPluginInstance.outputFileSystem
			));
	});
});
