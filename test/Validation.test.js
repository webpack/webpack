/* globals describe, it */
"use strict";

require("should");
const webpack = require("../lib/webpack");
const WebpackOptionsValidationError = require("../lib/WebpackOptionsValidationError");

describe("Validation", function() {
	const testCases = [{
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
			"   object { <key>: non-empty string | [non-empty string] } | non-empty string | [non-empty string] | function",
			"   The entry point(s) of the compilation."
		]
	}, {
		name: "empty entry string",
		config: {
			entry: ""
		},
		message: [
			" - configuration.entry should be one of these:",
			"   object { <key>: non-empty string | [non-empty string] } | non-empty string | [non-empty string] | function",
			"   The entry point(s) of the compilation.",
			"   Details:",
			"    * configuration.entry should be an object.",
			"    * configuration.entry should not be empty.",
			"    * configuration.entry should be an array:",
			"      [non-empty string]",
			"    * configuration.entry should be an instance of function",
			"      function returning an entry object or a promise.."
		]
	}, {
		name: "empty entry bundle array",
		config: {
			entry: {
				"bundle": []
			}
		},
		message: [
			" - configuration.entry should be one of these:",
			"   object { <key>: non-empty string | [non-empty string] } | non-empty string | [non-empty string] | function",
			"   The entry point(s) of the compilation.",
			"   Details:",
			"    * configuration.entry['bundle'] should be a string.",
			"    * configuration.entry['bundle'] should not be empty.",
			"    * configuration.entry['bundle'] should be one of these:",
			"      non-empty string | [non-empty string]",
			"    * configuration.entry should be a string.",
			"    * configuration.entry should be an array:",
			"      [non-empty string]",
			"    * configuration.entry should be an instance of function",
			"      function returning an entry object or a promise.."
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
			" - configuration.entry should be one of these:",
			"   object { <key>: non-empty string | [non-empty string] } | non-empty string | [non-empty string] | function",
			"   The entry point(s) of the compilation.",
			"   Details:",
			"    * configuration.entry should be an object.",
			"    * configuration.entry should be a string.",
			"    * configuration.entry[0] should be a string.",
			"    * configuration.entry should be an instance of function",
			"      function returning an entry object or a promise..",
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
			" - configuration[0].entry should be one of these:",
			"   object { <key>: non-empty string | [non-empty string] } | non-empty string | [non-empty string] | function",
			"   The entry point(s) of the compilation.",
			"   Details:",
			"    * configuration[0].entry should be an object.",
			"    * configuration[0].entry should be a string.",
			"    * configuration[0].entry[0] should be a string.",
			"    * configuration[0].entry should be an instance of function",
			"      function returning an entry object or a promise..",
			" - configuration[1].output.filename should be a string."
		]
	}, {
		name: "deep error",
		config: {
			entry: "a",
			module: {
				rules: [{
					oneOf: [{
						test: "/a",
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
	}, {
		name: "enum",
		config: {
			entry: "a",
			devtool: true
		},
		message: [
			" - configuration.devtool should be one of these:",
			"   string | false",
			"   A developer tool to enhance debugging.",
			"   Details:",
			"    * configuration.devtool should be a string.",
			"    * configuration.devtool should be false"
		]
	}, {
		name: "non-absolute path",
		config: {
			entry: "foo.js",
			output: {
				filename: "/bar"
			}
		},
		message: [
			" - configuration.output.filename A non-absolut path is expected. However the provided value \"/bar\" is an absolute path!",
			"    ({",
			"     \"keyword\": \"absolutePath\",",
			"     \"params\": {",
			"       \"absolutePath\": \"/bar\"",
			"     },",
			"     \"message\": \"A non-absolut path is expected. However the provided value \\\"/bar\\\" is an absolute path!\\n\",",
			"     \"parentSchema\": {",
			"       \"description\": \"Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.\",",
			"       \"type\": \"string\",",
			"       \"absolutePath\": false",
			"     },",
			"     \"dataPath\": \".output.filename\",",
			"     \"schemaPath\": \"#/definitions/output/properties/filename/absolutePath\",",
			"     \"schema\": false,",
			"     \"data\": \"/bar\"",
			"   }).",
			"   string",
			"   Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files."
		]
	}, {
		name: "absolute path",
		config: {
			entry: "foo.js",
			output: {
				filename: "bar"
			},
			context: "baz"
		},
		message: [
			" - configuration.context The provided value \"baz\" is not an absolute path!",
			"    ({",
			"     \"keyword\": \"absolutePath\",",
			"     \"params\": {",
			"       \"absolutePath\": \"baz\"",
			"     },",
			"     \"message\": \"The provided value \\\"baz\\\" is not an absolute path!\\n\",",
			"     \"parentSchema\": {",
			"       \"description\": \"The base directory (absolute path!) for resolving the `entry` option. If `output.pathinfo` is set, the included pathinfo is shortened to this directory.\",",
			"       \"type\": \"string\",",
			"       \"absolutePath\": true",
			"     },",
			"     \"dataPath\": \".context\",",
			"     \"schemaPath\": \"#/properties/context/absolutePath\",",
			"     \"schema\": true,",
			"     \"data\": \"baz\"",
			"   }).",
			"   string",
			"   The base directory (absolute path!) for resolving the `entry` option. If `output.pathinfo` is set, the included pathinfo is shortened to this directory."
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
		});
	});
});
