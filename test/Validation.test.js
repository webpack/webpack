/* globals describe, it */
"use strict";

const webpack = require("..");

describe("Validation", () => {
	const createTestCase = (name, config, fn) => {
		it("should fail validation for " + name, () => {
			try {
				webpack(config);
			} catch (err) {
				if (err.name !== "WebpackOptionsValidationError") throw err;

				expect(err.message).toMatch(/^Invalid configuration object./);
				fn(err.message);

				return;
			}

			throw new Error("Validation didn't fail");
		});
	};

	createTestCase("undefined configuration", undefined, msg =>
		expect(msg).toMatchInlineSnapshot(`
		"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
		 - configuration should be an object."
	`)
	);

	createTestCase("null configuration", null, msg =>
		expect(msg).toMatchInlineSnapshot(`
		"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
		 - configuration should be an object."
	`)
	);

	createTestCase(
		"empty entry string",
		{
			entry: ""
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration.entry should be an non-empty string.
			   -> An entry point without name. The string is resolved to a module which is loaded upon startup."
		`)
	);

	createTestCase(
		"empty entry bundle array",
		{
			entry: {
				bundle: []
			}
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration.entry['bundle'] should be an non-empty array.
			   -> A non-empty array of non-empty strings"
		`)
	);

	createTestCase(
		"invalid instanceof",
		{
			entry: "a",
			module: {
				wrappedContextRegExp: 1337
			}
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration.module.wrappedContextRegExp should be an instance of RegExp
			   -> Set the inner regular expression for partial dynamic dependencies"
		`)
	);

	createTestCase(
		"invalid minimum",
		{
			entry: "a",
			parallelism: 0
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration.parallelism should be >= 1.
			   -> The number of parallel processed modules in the compilation."
		`)
	);

	createTestCase(
		"repeated value",
		{
			entry: ["abc", "def", "abc"]
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration.entry should not contain the item 'abc' twice.
			   -> A non-empty array of non-empty strings"
		`)
	);

	createTestCase(
		"multiple errors",
		{
			entry: [/a/],
			output: {
				filename: /a/
			}
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration.entry[0] should be a string.
			   -> A non-empty string
			 - configuration.output.filename should be one of these:
			   string | function
			   -> Specifies the name of each output file on disk. You must **not** specify an absolute path here! The \`output.path\` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
			   Details:
			    * configuration.output.filename should be a string.
			    * configuration.output.filename should be an instance of function"
		`)
	);

	createTestCase(
		"multiple configurations",
		[
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
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration[0].entry[0] should be a string.
			   -> A non-empty string
			 - configuration[1].output.filename should be one of these:
			   string | function
			   -> Specifies the name of each output file on disk. You must **not** specify an absolute path here! The \`output.path\` option determines the location on disk the files are written to, filename is used solely for naming the individual files.
			   Details:
			    * configuration[1].output.filename should be a string.
			    * configuration[1].output.filename should be an instance of function"
		`)
	);

	createTestCase(
		"deep error",
		{
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
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration.module.rules[0].oneOf[0] has an unknown property 'passer'. These properties are valid:
			   object { compiler?, enforce?, exclude?, include?, issuer?, loader?, loaders?, oneOf?, options?, parser?, query?, realResource?, resolve?, resource?, resourceQuery?, rules?, sideEffects?, test?, type?, use? }
			   -> A rule"
		`)
	);

	createTestCase(
		"additional key on root",
		{
			entry: "a",
			postcss: () => {}
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration has an unknown property 'postcss'. These properties are valid:
			   object { amd?, bail?, cache?, context?, dependencies?, devServer?, devtool?, entry?, externals?, infrastructureLogging?, loader?, mode?, module?, name?, node?, optimization?, output?, parallelism?, performance?, plugins?, profile?, recordsInputPath?, recordsOutputPath?, recordsPath?, resolve?, resolveLoader?, serve?, stats?, target?, watch?, watchOptions? }
			   For typos: please correct them.
			   For loader options: webpack >= v2.0.0 no longer allows custom properties in configuration.
			     Loaders should be updated to allow passing options via loader options in module.rules.
			     Until loaders are updated one can use the LoaderOptionsPlugin to pass these options to the loader:
			     plugins: [
			       new webpack.LoaderOptionsPlugin({
			         // test: /\\\\.xxx$/, // may apply this only for some modules
			         options: {
			           postcss: …
			         }
			       })
			     ]"
		`)
	);

	createTestCase(
		"enum",
		{
			entry: "a",
			devtool: true
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration.devtool should be one of these:
			   string | false
			   -> A developer tool to enhance debugging.
			   Details:
			    * configuration.devtool should be a string.
			    * configuration.devtool should be false"
		`)
	);

	createTestCase(
		"! in path",
		{
			entry: "foo.js",
			output: {
				path: "/somepath/!test",
				filename: "bar"
			}
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration.output.path: The provided value \\"/somepath/!test\\" contains exclamation mark (!) which is not allowed because it's reserved for loader syntax.
			   -> The output directory as **absolute path** (required)."
		`)
	);

	createTestCase(
		"relative path",
		{
			entry: "foo.js",
			output: {
				filename: "/bar"
			}
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration.output.filename: A relative path is expected. However, the provided value \\"/bar\\" is an absolute path!
			   Please use output.path to specify absolute path and output.filename for the file name."
		`)
	);

	createTestCase(
		"absolute path",
		{
			entry: "foo.js",
			output: {
				filename: "bar"
			},
			context: "baz"
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration.context: The provided value \\"baz\\" is not an absolute path!
			   -> The base directory (absolute path!) for resolving the \`entry\` option. If \`output.pathinfo\` is set, the included pathinfo is shortened to this directory."
		`)
	);

	createTestCase(
		"missing stats option",
		{
			entry: "foo.js",
			stats: {
				foobar: true
			}
		},
		msg => {
			expect(
				msg
					.replace(/object \{ .* \}/g, "object {...}")
					.replace(/"none" \| .+/g, '"none" | ...')
			).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration.stats has an unknown property 'foobar'. These properties are valid:
			   object {...}"
		`);
		}
	);

	createTestCase(
		"Invalid plugin provided: bool",
		{
			entry: "foo.js",
			plugins: [false]
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration.plugins[0] should be one of these:
			   object { apply, … } | function
			   -> Plugin of type object or instanceof Function
			   Details:
			    * configuration.plugins[0] should be an object.
			      -> Plugin instance
			    * configuration.plugins[0] should be an instance of function
			      -> Function acting as plugin"
		`)
	);

	createTestCase(
		"Invalid plugin provided: array",
		{
			entry: "foo.js",
			plugins: [[]]
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration.plugins[0] should be one of these:
			   object { apply, … } | function
			   -> Plugin of type object or instanceof Function
			   Details:
			    * configuration.plugins[0] should be an object.
			      -> Plugin instance
			    * configuration.plugins[0] should be an instance of function
			      -> Function acting as plugin"
		`)
	);

	createTestCase(
		"Invalid plugin provided: string",
		{
			entry: "foo.js",
			plugins: ["abc123"]
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration.plugins[0] should be one of these:
			   object { apply, … } | function
			   -> Plugin of type object or instanceof Function
			   Details:
			    * configuration.plugins[0] should be an object.
			      -> Plugin instance
			    * configuration.plugins[0] should be an instance of function
			      -> Function acting as plugin"
		`)
	);

	createTestCase(
		"Invalid plugin provided: int",
		{
			entry: "foo.js",
			plugins: [12]
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration.plugins[0] should be one of these:
			   object { apply, … } | function
			   -> Plugin of type object or instanceof Function
			   Details:
			    * configuration.plugins[0] should be an object.
			      -> Plugin instance
			    * configuration.plugins[0] should be an instance of function
			      -> Function acting as plugin"
		`)
	);

	createTestCase(
		"Invalid plugin provided: object without apply function",
		{
			entry: "foo.js",
			plugins: [{}]
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration.plugins[0] misses the property 'apply'.
			   function
			   -> The run point of the plugin, required method."
		`)
	);

	createTestCase(
		"invalid mode",
		{
			mode: "protuction"
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration.mode should be one of these:
			   \\"development\\" | \\"production\\" | \\"none\\"
			   -> Enable production optimizations or development hints."
		`)
	);

	createTestCase(
		"missing cache group name",
		{
			optimization: {
				splitChunks: {
					cacheGroups: {
						test: /abc/
					}
				}
			}
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration.optimization.splitChunks.cacheGroups should not be object { test, … }
			   -> Using the cacheGroup shorthand syntax with a cache group named 'test' is a potential config error
			   Did you intent to define a cache group with a test instead?
			   cacheGroups: {
			     <name>: {
			       test: ...
			     }
			   }
			   object { <key>: false | function | string | RegExp | object { automaticNameDelimiter?, automaticNameMaxLength?, automaticNamePrefix?, chunks?, enforce?, filename?, maxAsyncRequests?, maxInitialRequests?, maxSize?, minChunks?, minSize?, name?, priority?, reuseExistingChunk?, test? } }
			   -> Assign modules to a cache group (modules from different cache groups are tried to keep in separate chunks)"
		`)
	);

	createTestCase(
		"holey array",
		// eslint-disable-next-line no-sparse-arrays
		[
			{
				mode: "production"
			},
			,
			{
				mode: "development"
			}
		],
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.
			 - configuration should be an object."
		`)
	);
});
