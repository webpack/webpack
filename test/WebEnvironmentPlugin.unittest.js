"use strict";

const WebEnvironmentPlugin = require("../lib/web/WebEnvironmentPlugin");

describe("WebEnvironmentPlugin", () => {
	describe("apply", () => {
		const WebEnvironmentPluginInstance = new WebEnvironmentPlugin(
			"inputFileSystem",
			"outputFileSystem"
		);
		const compileSpy = {
			outputFileSystem: "otherOutputFileSystem"
		};

		WebEnvironmentPluginInstance.apply(compileSpy);

		it("should set compiler.outputFileSystem information with the same as set in WebEnvironmentPlugin", () => {
			expect(compileSpy.outputFileSystem).toBe(
				WebEnvironmentPluginInstance.outputFileSystem
			);
		});
	});
});
