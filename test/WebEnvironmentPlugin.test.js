var should = require("should");
var WebEnvironmentPlugin = require("../lib/web/WebEnvironmentPlugin");

describe("WebEnvironmentPlugin", function() {
	var WebEnvironmentPluginInstance;

	before(function() {
		WebEnvironmentPluginInstance = new WebEnvironmentPlugin("inputFileSystem", "outputFileSystem");
	});

	describe("apply", function() {
		var compileSpy;
		before(function() {
			compileSpy = {
				outputFileSystem: "otherOutputFileSystem"
			};
			WebEnvironmentPluginInstance.apply(compileSpy);
		});

		it("should set compiler.outputFileSystem information with the same as setted in WebEnvironmentPlugin", function() {
			should(compileSpy.outputFileSystem).be.eql(WebEnvironmentPluginInstance.outputFileSystem);
		});
	});
});
