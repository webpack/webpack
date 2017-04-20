"use strict";

const WebEnvironmentPlugin = require("../lib/web/WebEnvironmentPlugin");

describe("WebEnvironmentPlugin", () => {
	let WebEnvironmentPluginInstance;

	beforeEach(() => WebEnvironmentPluginInstance = new WebEnvironmentPlugin("inputFileSystem", "outputFileSystem"));

	describe("apply", () => {
		let compileSpy;
		beforeEach(() => {
			compileSpy = {
				outputFileSystem: "otherOutputFileSystem"
			};
			WebEnvironmentPluginInstance.apply(compileSpy);
		});

		it("should set compiler.outputFileSystem information with the same as setted in WebEnvironmentPlugin", () =>
			expect(compileSpy.outputFileSystem).toEqual(WebEnvironmentPluginInstance.outputFileSystem));
	});
});
