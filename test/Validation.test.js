var should = require("should");
var webpack = require("../lib/webpack");
var WebpackOptionsValidationError = require("../lib/WebpackOptionsValidationError");

describe("Validation", function() {
	var testCases = [{
		name: "undefined configuration",
		config: undefined,
		message: [
			" - configuration should be an object."
		]
	}, {
		name: "null configuration",
		config: null,
		message: [
			" - configuration should be an object."
		]
	}, {
		name: "empty configuration",
		config: {},
		message: [
			" - configuration misses the property 'entry'.",
			"   object { <key>: string | [string] } | string | [string]",
			"   The entry point(s) of the compilation."
		]
	}, {
		name: "empty entry string",
		config: {
			entry: ""
		},
		message: [
			" - configuration.entry should be one of these:",
			"   object { <key>: string | [string] } | string | [string]",
			"   The entry point(s) of the compilation."
		]
	}, {
		name: "invalid instanceof",
		config: {
			entry: "a",
			module: {
				wrappedContextRegExp: 1337
			}
		},
		message: [
			" - configuration.module.wrappedContextRegExp should be an instance of RegExp.",
		]
	}, {
		name: "multiple errors",
		config: {
			entry: [/a/],
			output: {
				filename: /a/
			}
		},
		message: [
			" - configuration.entry[0] should be a string.",
			" - configuration.entry should be one of these:",
			"   object { <key>: string | [string] } | string | [string]",
			"   The entry point(s) of the compilation.",
			" - configuration.output.filename should be a string."
		]
	}, {
		name: "multiple configurations",
		config: [{
			entry: [/a/],
		}, {
			entry: "a",
			output: {
				filename: /a/
			}
		}],
		message: [
			" - configuration[0].entry[0] should be a string.",
			" - configuration[0].entry should be one of these:",
			"   object { <key>: string | [string] } | string | [string]",
			"   The entry point(s) of the compilation.",
			" - configuration[1].output.filename should be a string."
		]
	}, {
		name: "deep error",
		config: {
			entry: "a",
			module: {
				rules: [{
					oneOf: [{
						test: "a",
						paser: {
							amd: false
						}
					}]
				}]
			}
		},
		message: [
			" - configuration.module.rules[0].oneOf[0] has an unknown property 'paser'. These properties are valid:",
			"   object { enforce?, exclude?, include?, issuer?, loader?, loaders?, oneOf?, options?, parser?, query?, resource?, resourceQuery?, rules?, test?, use? }"
		]
	}, {
		name: "additional key on root",
		config: {
			entry: "a",
			postcss: function() {}
		},
		message: [
			" - configuration has an unknown property 'postcss'. These properties are valid:",
			"   object { amd?, bail?, cache?, context?, dependencies?, devServer?, devtool?, entry, externals?, " +
			"loader?, module?, name?, node?, output?, performance?, plugins?, profile?, recordsInputPath?, recordsOutputPath?, " +
			"recordsPath?, resolve?, resolveLoader?, stats?, target?, watch?, watchOptions? }",
			"   For typos: please correct them.",
			"   For loader options: webpack 2 no longer allows custom properties in configuration.",
			"     Loaders should be updated to allow passing options via loader options in module.rules.",
			"     Until loaders are updated one can use the LoaderOptionsPlugin to pass these options to the loader:",
			"     plugins: [",
			"       new webpack.LoaderOptionsPlugin({",
			"         // test: /\\.xxx$/, // may apply this only for some modules",
			"         options: {",
			"           postcss: ...",
			"         }",
			"       })",
			"     ]"
		]
	}];
	testCases.forEach(function(testCase) {
		it("should fail validation for " + testCase.name, function() {
			try {
				webpack(testCase.config);
			} catch(e) {
				if(!(e instanceof WebpackOptionsValidationError))
					throw e;
				e.message.should.startWith("Invalid configuration object.");
				e.message.split("\n").slice(1).should.be.eql(testCase.message);
				return;
			}
			throw new Error("Validation didn't fail");
		})
	});
});
