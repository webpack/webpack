/* globals describe, it */
"use strict";

require("should");

const webpack = require("../lib/webpack");

describe("Validation", () => {
	const testCases = [
		{
			name: "undefined configuration",
			config: undefined,
			message: [" - configuration should be an object."]
		},
		{
			name: "null configuration",
			config: null,
			message: [" - configuration should be an object."]
		},
		{
			name: "empty entry string",
			config: {
				entry: ""
			},
			message: [
				" - configuration.entry should be one of these:",
				"   object { <key>: non-empty string | [non-empty string] } | non-empty string | [non-empty string] | function",
				"   -> The entry point(s) of the compilation.",
				"   Details:",
				"    * configuration.entry should be an object.",
				"      -> Multiple entry bundles are created. The key is the chunk name. The value can be a string or an array.",
				"    * configuration.entry should not be empty.",
				"      -> An entry point without name. The string is resolved to a module which is loaded upon startup.",
				"    * configuration.entry should be an array:",
				"      [non-empty string]",
				"    * configuration.entry should be an instance of function",
				"      -> A Function returning an entry object, an entry string, an entry array or a promise to these things."
			]
		},
		{
			name: "empty entry bundle array",
			config: {
				entry: {
					bundle: []
				}
			},
			message: [
				" - configuration.entry should be one of these:",
				"   object { <key>: non-empty string | [non-empty string] } | non-empty string | [non-empty string] | function",
				"   -> The entry point(s) of the compilation.",
				"   Details:",
				"    * configuration.entry['bundle'] should be a string.",
				"      -> The string is resolved to a module which is loaded upon startup.",
				"    * configuration.entry['bundle'] should not be empty.",
				"    * configuration.entry should be a string.",
				"      -> An entry point without name. The string is resolved to a module which is loaded upon startup.",
				"    * configuration.entry should be an array:",
				"      [non-empty string]",
				"    * configuration.entry should be an instance of function",
				"      -> A Function returning an entry object, an entry string, an entry array or a promise to these things."
			]
		},
		{
			name: "invalid instanceof",
			config: {
				entry: "a",
				module: {
					wrappedContextRegExp: 1337
				}
			},
			message: [
				" - configuration.module.wrappedContextRegExp should be an instance of RegExp",
				"   -> Set the inner regular expression for partial dynamic dependencies"
			]
		},
		{
			name: "invalid minimum",
			config: {
				entry: "a",
				parallelism: 0
			},
			message: [
				" - configuration.parallelism should be >= 1.",
				"   -> The number of parallel processed modules in the compilation."
			]
		},
		{
			name: "repeated value",
			config: {
				entry: ["abc", "def", "abc"]
			},
			message: [
				" - configuration.entry should be one of these:",
				"   object { <key>: non-empty string | [non-empty string] } | non-empty string | [non-empty string] | function",
				"   -> The entry point(s) of the compilation.",
				"   Details:",
				"    * configuration.entry should be an object.",
				"      -> Multiple entry bundles are created. The key is the chunk name. The value can be a string or an array.",
				"    * configuration.entry should be a string.",
				"      -> An entry point without name. The string is resolved to a module which is loaded upon startup.",
				"    * configuration.entry should not contain the item 'abc' twice.",
				"    * configuration.entry should be an instance of function",
				"      -> A Function returning an entry object, an entry string, an entry array or a promise to these things."
			]
		},
		{
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
				"   -> The entry point(s) of the compilation.",
				"   Details:",
				"    * configuration.entry should be an object.",
				"      -> Multiple entry bundles are created. The key is the chunk name. The value can be a string or an array.",
				"    * configuration.entry should be a string.",
				"      -> An entry point without name. The string is resolved to a module which is loaded upon startup.",
				"    * configuration.entry[0] should be a string.",
				"      -> A non-empty string",
				"    * configuration.entry should be an instance of function",
				"      -> A Function returning an entry object, an entry string, an entry array or a promise to these things.",
				" - configuration.output.filename should be one of these:",
				"   string | function",
				"   -> Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.",
				"   Details:",
				"    * configuration.output.filename should be a string.",
				"    * configuration.output.filename should be an instance of function"
			]
		},
		{
			name: "multiple configurations",
			config: [
				{
					entry: [/a/]
				},
				{
					entry: "a",
					output: {
						filename: /a/
					}
				}
			],
			message: [
				" - configuration[0].entry should be one of these:",
				"   object { <key>: non-empty string | [non-empty string] } | non-empty string | [non-empty string] | function",
				"   -> The entry point(s) of the compilation.",
				"   Details:",
				"    * configuration[0].entry should be an object.",
				"      -> Multiple entry bundles are created. The key is the chunk name. The value can be a string or an array.",
				"    * configuration[0].entry should be a string.",
				"      -> An entry point without name. The string is resolved to a module which is loaded upon startup.",
				"    * configuration[0].entry[0] should be a string.",
				"      -> A non-empty string",
				"    * configuration[0].entry should be an instance of function",
				"      -> A Function returning an entry object, an entry string, an entry array or a promise to these things.",
				" - configuration[1].output.filename should be one of these:",
				"   string | function",
				"   -> Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.",
				"   Details:",
				"    * configuration[1].output.filename should be a string.",
				"    * configuration[1].output.filename should be an instance of function"
			]
		},
		{
			name: "deep error",
			config: {
				entry: "a",
				module: {
					rules: [
						{
							oneOf: [
								{
									test: "/a",
									passer: {
										amd: false
									}
								}
							]
						}
					]
				}
			},
			message: [
				" - configuration.module.rules[0].oneOf[0] has an unknown property 'passer'. These properties are valid:",
				"   object { enforce?, exclude?, include?, issuer?, loader?, loaders?, oneOf?, options?, parser?, resolve?, sideEffects?, query?, type?, resource?, resourceQuery?, compiler?, rules?, test?, use? }",
				"   -> A rule"
			]
		},
		{
			name: "additional key on root",
			config: {
				entry: "a",
				postcss: () => {}
			},
			message: [
				" - configuration has an unknown property 'postcss'. These properties are valid:",
				"   object { mode?, amd?, bail?, cache?, context?, dependencies?, devServer?, devtool?, entry?, externals?, " +
					"loader?, module?, name?, node?, output?, optimization?, parallelism?, performance?, plugins?, profile?, recordsInputPath?, " +
					"recordsOutputPath?, recordsPath?, resolve?, resolveLoader?, stats?, target?, watch?, watchOptions? }",
				"   For typos: please correct them.",
				"   For loader options: webpack >= v2.0.0 no longer allows custom properties in configuration.",
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
		},
		{
			name: "enum",
			config: {
				entry: "a",
				devtool: true
			},
			message: [
				" - configuration.devtool should be one of these:",
				"   string | false",
				"   -> A developer tool to enhance debugging.",
				"   Details:",
				"    * configuration.devtool should be a string.",
				"    * configuration.devtool should be false"
			]
		},
		{
			name: "relative path",
			config: {
				entry: "foo.js",
				output: {
					filename: "/bar"
				}
			},
			message: [
				' - configuration.output.filename: A relative path is expected. However the provided value "/bar" is an absolute path!',
				"   -> Specifies the name of each output file on disk. You must **not** specify an absolute path here! The `output.path` option determines the location on disk the files are written to, filename is used solely for naming the individual files.",
				"   Please use output.path to specify absolute path and output.filename for the file name."
			]
		},
		{
			name: "absolute path",
			config: {
				entry: "foo.js",
				output: {
					filename: "bar"
				},
				context: "baz"
			},
			message: [
				' - configuration.context: The provided value "baz" is not an absolute path!',
				"   -> The base directory (absolute path!) for resolving the `entry` option. If `output.pathinfo` is set, the included pathinfo is shortened to this directory."
			]
		},
		{
			name: "missing stats option",
			config: {
				entry: "foo.js",
				stats: {
					foobar: true
				}
			},
			test(err) {
				err.message.should.startWith("Invalid configuration object.");
				err.message
					.split("\n")
					.slice(1)[0]
					.should.be.eql(" - configuration.stats should be one of these:");
			}
		},
		{
			name: "Invalid plugin provided: bool",
			config: {
				entry: "foo.js",
				plugins: [false]
			},
			message: [
				" - configuration.plugins[0] should be one of these:",
				"   object { apply, ... } | function",
				"   -> Plugin of type object or instanceof Function",
				"   Details:",
				"    * configuration.plugins[0] should be an object.",
				"      -> Plugin instance",
				"    * configuration.plugins[0] should be an instance of function",
				"      -> Function acting as plugin"
			]
		},
		{
			name: "Invalid plugin provided: array",
			config: {
				entry: "foo.js",
				plugins: [[]]
			},
			message: [
				" - configuration.plugins[0] should be one of these:",
				"   object { apply, ... } | function",
				"   -> Plugin of type object or instanceof Function",
				"   Details:",
				"    * configuration.plugins[0] should be an object.",
				"      -> Plugin instance",
				"    * configuration.plugins[0] should be an instance of function",
				"      -> Function acting as plugin"
			]
		},
		{
			name: "Invalid plugin provided: string",
			config: {
				entry: "foo.js",
				plugins: ["abc123"]
			},
			message: [
				" - configuration.plugins[0] should be one of these:",
				"   object { apply, ... } | function",
				"   -> Plugin of type object or instanceof Function",
				"   Details:",
				"    * configuration.plugins[0] should be an object.",
				"      -> Plugin instance",
				"    * configuration.plugins[0] should be an instance of function",
				"      -> Function acting as plugin"
			]
		},
		{
			name: "Invalid plugin provided: int",
			config: {
				entry: "foo.js",
				plugins: [12]
			},
			message: [
				" - configuration.plugins[0] should be one of these:",
				"   object { apply, ... } | function",
				"   -> Plugin of type object or instanceof Function",
				"   Details:",
				"    * configuration.plugins[0] should be an object.",
				"      -> Plugin instance",
				"    * configuration.plugins[0] should be an instance of function",
				"      -> Function acting as plugin"
			]
		},
		{
			name: "Invalid plugin provided: object without apply function",
			config: {
				entry: "foo.js",
				plugins: [{}]
			},
			message: [
				" - configuration.plugins[0] should be one of these:",
				"   object { apply, ... } | function",
				"   -> Plugin of type object or instanceof Function",
				"   Details:",
				"    * configuration.plugins[0] misses the property 'apply'.",
				"      function",
				"      -> The run point of the plugin, required method.",
				"    * configuration.plugins[0] misses the property 'apply'.",
				"      function",
				"      -> The run point of the plugin, required method.",
				"    * configuration.plugins[0] should be an instance of function",
				"      -> Function acting as plugin"
			]
		}
	];

	testCases.forEach(testCase => {
		it("should fail validation for " + testCase.name, () => {
			try {
				webpack(testCase.config);
			} catch (err) {
				if (err.name !== "WebpackOptionsValidationError") throw err;

				if (testCase.test) {
					testCase.test(err);

					return;
				}

				err.message.should.startWith("Invalid configuration object.");
				err.message
					.split("\n")
					.slice(1)
					.should.be.eql(testCase.message);

				return;
			}

			throw new Error("Validation didn't fail");
		});
	});
});
