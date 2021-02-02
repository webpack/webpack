"use strict";

const webpack = require("..");

describe("Validation", () => {
	const createTestCase = (name, config, fn) => {
		it("should fail validation for " + name, () => {
			try {
				webpack(config);
			} catch (err) {
				if (err.name !== "ValidationError") throw err;

				expect(err.message).toMatch(/^Invalid configuration object./);
				fn(err.message);

				return;
			}

			throw new Error("Validation didn't fail");
		});
	};

	createTestCase("undefined configuration", undefined, msg =>
		expect(msg).toMatchInlineSnapshot(`
		"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
		 - configuration should be an object:
		   object { amd?, bail?, cache?, context?, dependencies?, devServer?, devtool?, entry?, experiments?, externals?, externalsPresets?, externalsType?, ignoreWarnings?, infrastructureLogging?, loader?, mode?, module?, name?, node?, optimization?, output?, parallelism?, performance?, plugins?, profile?, recordsInputPath?, recordsOutputPath?, recordsPath?, resolve?, resolveLoader?, snapshot?, stats?, target?, watch?, watchOptions? }
		   -> Options object as provided by the user."
	`)
	);

	createTestCase("null configuration", null, msg =>
		expect(msg).toMatchInlineSnapshot(`
		"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
		 - configuration should be an object:
		   object { amd?, bail?, cache?, context?, dependencies?, devServer?, devtool?, entry?, experiments?, externals?, externalsPresets?, externalsType?, ignoreWarnings?, infrastructureLogging?, loader?, mode?, module?, name?, node?, optimization?, output?, parallelism?, performance?, plugins?, profile?, recordsInputPath?, recordsOutputPath?, recordsPath?, resolve?, resolveLoader?, snapshot?, stats?, target?, watch?, watchOptions? }
		   -> Options object as provided by the user."
	`)
	);

	createTestCase(
		"empty entry string",
		{
			entry: ""
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.entry should be an non-empty string.
			   -> The string is resolved to a module which is loaded upon startup."
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.entry['bundle'] should be an non-empty array.
			   -> All modules are loaded upon startup. The last one is exported."
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.module.wrappedContextRegExp should be an instance of RegExp.
			   -> Set the inner regular expression for partial dynamic dependencies. Deprecated: This option has moved to 'module.parser.javascript.wrappedContextRegExp'."
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.entry should not contain the item 'abc' twice.
			   -> All modules are loaded upon startup. The last one is exported."
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.entry[0] should be a non-empty string.
			   -> A module that is loaded upon startup. Only the last one is exported.
			 - configuration.output.filename should be one of these:
			   non-empty string | function
			   -> Specifies the filename template of output files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
			   Details:
			    * configuration.output.filename should be a non-empty string.
			    * configuration.output.filename should be an instance of function."
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration[0].entry[0] should be a non-empty string.
			   -> A module that is loaded upon startup. Only the last one is exported.
			 - configuration[1].output.filename should be one of these:
			   non-empty string | function
			   -> Specifies the filename template of output files on disk. You must **not** specify an absolute path here, but the path may contain folders separated by '/'! The specified path is joined with the value of the 'output.path' option to determine the location on disk.
			   Details:
			    * configuration[1].output.filename should be a non-empty string.
			    * configuration[1].output.filename should be an instance of function."
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.module.rules[0].oneOf[0] has an unknown property 'passer'. These properties are valid:
			   object { compiler?, dependency?, descriptionData?, enforce?, exclude?, generator?, include?, issuer?, issuerLayer?, layer?, loader?, mimetype?, oneOf?, options?, parser?, realResource?, resolve?, resource?, resourceFragment?, resourceQuery?, rules?, sideEffects?, test?, type?, use? }
			   -> A rule description with conditions and effects for modules."
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration has an unknown property 'postcss'. These properties are valid:
			   object { amd?, bail?, cache?, context?, dependencies?, devServer?, devtool?, entry?, experiments?, externals?, externalsPresets?, externalsType?, ignoreWarnings?, infrastructureLogging?, loader?, mode?, module?, name?, node?, optimization?, output?, parallelism?, performance?, plugins?, profile?, recordsInputPath?, recordsOutputPath?, recordsPath?, resolve?, resolveLoader?, snapshot?, stats?, target?, watch?, watchOptions? }
			   -> Options object as provided by the user.
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.devtool should be one of these:
			   false | \\"eval\\" | string (should match pattern \\"^(inline-|hidden-|eval-)?(nosources-)?(cheap-(module-)?)?source-map$\\")
			   -> A developer tool to enhance debugging (false | eval | [inline-|hidden-|eval-][nosources-][cheap-[module-]]source-map).
			   Details:
			    * configuration.devtool should be one of these:
			      false | \\"eval\\"
			    * configuration.devtool should be a string (should match pattern \\"^(inline-|hidden-|eval-)?(nosources-)?(cheap-(module-)?)?source-map$\\")."
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.stats has an unknown property 'foobar'. These properties are valid:
			   object {...}
			   -> Stats options object."
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.plugins[0] should be one of these:
			   object { apply, … } | function
			   -> Plugin of type object or instanceof Function.
			   Details:
			    * configuration.plugins[0] should be an object:
			      object { apply, … }
			      -> Plugin instance.
			    * configuration.plugins[0] should be an instance of function.
			      -> Function acting as plugin."
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.plugins[0] should be one of these:
			   object { apply, … } | function
			   -> Plugin of type object or instanceof Function.
			   Details:
			    * configuration.plugins[0] should be an object:
			      object { apply, … }
			      -> Plugin instance.
			    * configuration.plugins[0] should be an instance of function.
			      -> Function acting as plugin."
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.plugins[0] should be one of these:
			   object { apply, … } | function
			   -> Plugin of type object or instanceof Function.
			   Details:
			    * configuration.plugins[0] should be an object:
			      object { apply, … }
			      -> Plugin instance.
			    * configuration.plugins[0] should be an instance of function.
			      -> Function acting as plugin."
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.plugins[0] should be one of these:
			   object { apply, … } | function
			   -> Plugin of type object or instanceof Function.
			   Details:
			    * configuration.plugins[0] should be an object:
			      object { apply, … }
			      -> Plugin instance.
			    * configuration.plugins[0] should be an instance of function.
			      -> Function acting as plugin."
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.plugins[0] misses the property 'apply'. Should be:
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.mode should be one of these:
			   \\"development\\" | \\"production\\" | \\"none\\"
			   -> Enable production optimizations or development hints."
		`)
	);

	createTestCase(
		"debug",
		{
			debug: true
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration has an unknown property 'debug'. These properties are valid:
			   object { amd?, bail?, cache?, context?, dependencies?, devServer?, devtool?, entry?, experiments?, externals?, externalsPresets?, externalsType?, ignoreWarnings?, infrastructureLogging?, loader?, mode?, module?, name?, node?, optimization?, output?, parallelism?, performance?, plugins?, profile?, recordsInputPath?, recordsOutputPath?, recordsPath?, resolve?, resolveLoader?, snapshot?, stats?, target?, watch?, watchOptions? }
			   -> Options object as provided by the user.
			   The 'debug' property was removed in webpack 2.0.0.
			   Loaders should be updated to allow passing this option via loader options in module.rules.
			   Until loaders are updated one can use the LoaderOptionsPlugin to switch loaders into debug mode:
			   plugins: [
			     new webpack.LoaderOptionsPlugin({
			       debug: true
			     })
			   ]"
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.optimization.splitChunks.cacheGroups should not be object { test, … }.
			   -> Using the cacheGroup shorthand syntax with a cache group named 'test' is a potential config error
			   Did you intent to define a cache group with a test instead?
			   cacheGroups: {
			     <name>: {
			       test: ...
			     }
			   }.
			   object { <key>: false | RegExp | string | function | object { automaticNameDelimiter?, chunks?, enforce?, enforceSizeThreshold?, filename?, idHint?, layer?, maxAsyncRequests?, maxAsyncSize?, maxInitialRequests?, maxInitialSize?, maxSize?, minChunks?, minRemainingSize?, minSize?, name?, priority?, reuseExistingChunk?, test?, type?, usedExports? } }
			   -> Assign modules to a cache group (modules from different cache groups are tried to keep in separate chunks, default categories: 'default', 'defaultVendors')."
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
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration[1] should be an object:
			   object { amd?, bail?, cache?, context?, dependencies?, devServer?, devtool?, entry?, experiments?, externals?, externalsPresets?, externalsType?, ignoreWarnings?, infrastructureLogging?, loader?, mode?, module?, name?, node?, optimization?, output?, parallelism?, performance?, plugins?, profile?, recordsInputPath?, recordsOutputPath?, recordsPath?, resolve?, resolveLoader?, snapshot?, stats?, target?, watch?, watchOptions? }
			   -> Options object as provided by the user."
		`)
	);

	createTestCase(
		"ecmaVersion",
		{
			output: { ecmaVersion: 2015 }
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.output has an unknown property 'ecmaVersion'. These properties are valid:
			   object { assetModuleFilename?, auxiliaryComment?, charset?, chunkFilename?, chunkFormat?, chunkLoadTimeout?, chunkLoading?, chunkLoadingGlobal?, clean?, compareBeforeEmit?, crossOriginLoading?, devtoolFallbackModuleFilenameTemplate?, devtoolModuleFilenameTemplate?, devtoolNamespace?, enabledChunkLoadingTypes?, enabledLibraryTypes?, enabledWasmLoadingTypes?, environment?, filename?, globalObject?, hashDigest?, hashDigestLength?, hashFunction?, hashSalt?, hotUpdateChunkFilename?, hotUpdateGlobal?, hotUpdateMainFilename?, iife?, importFunctionName?, importMetaName?, library?, libraryExport?, libraryTarget?, module?, path?, pathinfo?, publicPath?, scriptType?, sourceMapFilename?, sourcePrefix?, strictModuleExceptionHandling?, umdNamedDefine?, uniqueName?, wasmLoading?, webassemblyModuleFilename?, workerChunkLoading?, workerWasmLoading? }
			   -> Options affecting the output of the compilation. \`output\` options tell webpack how to write the compiled files to disk.
			   Did you mean output.environment (output.ecmaVersion was a temporary configuration option during webpack 5 beta)?"
		`)
	);

	createTestCase(
		"devtool sourcemap",
		{
			devtool: "sourcemap"
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.devtool should match pattern \\"^(inline-|hidden-|eval-)?(nosources-)?(cheap-(module-)?)?source-map$\\".
			   BREAKING CHANGE since webpack 5: The devtool option is more strict.
			   Please strictly follow the order of the keywords in the pattern."
		`)
	);

	createTestCase(
		"devtool source-maps",
		{
			devtool: "source-maps"
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.devtool should match pattern \\"^(inline-|hidden-|eval-)?(nosources-)?(cheap-(module-)?)?source-map$\\".
			   BREAKING CHANGE since webpack 5: The devtool option is more strict.
			   Please strictly follow the order of the keywords in the pattern."
		`)
	);

	createTestCase(
		"invalid watch options",
		{
			watchOptions: true
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.watchOptions should be an object:
			   object { aggregateTimeout?, followSymlinks?, ignored?, poll?, stdin? }
			   -> Options for the watcher."
		`)
	);

	createTestCase(
		"devtool",
		{
			devtool: "cheap-eval-nosource-source-map"
		},
		msg =>
			expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.devtool should match pattern \\"^(inline-|hidden-|eval-)?(nosources-)?(cheap-(module-)?)?source-map$\\".
			   BREAKING CHANGE since webpack 5: The devtool option is more strict.
			   Please strictly follow the order of the keywords in the pattern."
		`)
	);

	describe("did you mean", () => {
		createTestCase(
			"module.rules",
			{
				rules: []
			},
			msg =>
				expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration has an unknown property 'rules'. These properties are valid:
			   object { amd?, bail?, cache?, context?, dependencies?, devServer?, devtool?, entry?, experiments?, externals?, externalsPresets?, externalsType?, ignoreWarnings?, infrastructureLogging?, loader?, mode?, module?, name?, node?, optimization?, output?, parallelism?, performance?, plugins?, profile?, recordsInputPath?, recordsOutputPath?, recordsPath?, resolve?, resolveLoader?, snapshot?, stats?, target?, watch?, watchOptions? }
			   -> Options object as provided by the user.
			   Did you mean module.rules?"
		`)
		);
		createTestCase(
			"optimization.splitChunks",
			{
				splitChunks: false
			},
			msg =>
				expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration has an unknown property 'splitChunks'. These properties are valid:
			   object { amd?, bail?, cache?, context?, dependencies?, devServer?, devtool?, entry?, experiments?, externals?, externalsPresets?, externalsType?, ignoreWarnings?, infrastructureLogging?, loader?, mode?, module?, name?, node?, optimization?, output?, parallelism?, performance?, plugins?, profile?, recordsInputPath?, recordsOutputPath?, recordsPath?, resolve?, resolveLoader?, snapshot?, stats?, target?, watch?, watchOptions? }
			   -> Options object as provided by the user.
			   Did you mean optimization.splitChunks?"
		`)
		);
		createTestCase(
			"module.noParse",
			{
				noParse: /a/
			},
			msg =>
				expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration has an unknown property 'noParse'. These properties are valid:
			   object { amd?, bail?, cache?, context?, dependencies?, devServer?, devtool?, entry?, experiments?, externals?, externalsPresets?, externalsType?, ignoreWarnings?, infrastructureLogging?, loader?, mode?, module?, name?, node?, optimization?, output?, parallelism?, performance?, plugins?, profile?, recordsInputPath?, recordsOutputPath?, recordsPath?, resolve?, resolveLoader?, snapshot?, stats?, target?, watch?, watchOptions? }
			   -> Options object as provided by the user.
			   Did you mean module.noParse?"
		`)
		);
		createTestCase(
			"opimization.moduleIds",
			{
				optimization: {
					hashedModuleIds: true
				}
			},
			msg =>
				expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.optimization has an unknown property 'hashedModuleIds'. These properties are valid:
			   object { checkWasmTypes?, chunkIds?, concatenateModules?, emitOnErrors?, flagIncludedChunks?, innerGraph?, mangleExports?, mangleWasmImports?, mergeDuplicateChunks?, minimize?, minimizer?, moduleIds?, noEmitOnErrors?, nodeEnv?, portableRecords?, providedExports?, realContentHash?, removeAvailableModules?, removeEmptyChunks?, runtimeChunk?, sideEffects?, splitChunks?, usedExports? }
			   -> Enables/Disables integrated optimizations.
			   Did you mean optimization.moduleIds: \\"hashed\\" (BREAKING CHANGE since webpack 5)?"
		`)
		);
		createTestCase(
			"optimization.chunkIds",
			{
				optimization: {
					namedChunks: true
				}
			},
			msg =>
				expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.optimization has an unknown property 'namedChunks'. These properties are valid:
			   object { checkWasmTypes?, chunkIds?, concatenateModules?, emitOnErrors?, flagIncludedChunks?, innerGraph?, mangleExports?, mangleWasmImports?, mergeDuplicateChunks?, minimize?, minimizer?, moduleIds?, noEmitOnErrors?, nodeEnv?, portableRecords?, providedExports?, realContentHash?, removeAvailableModules?, removeEmptyChunks?, runtimeChunk?, sideEffects?, splitChunks?, usedExports? }
			   -> Enables/Disables integrated optimizations.
			   Did you mean optimization.chunkIds: \\"named\\" (BREAKING CHANGE since webpack 5)?"
		`)
		);
		createTestCase(
			"optimization.chunk/moduleIds",
			{
				optimization: {
					occurrenceOrder: true
				}
			},
			msg =>
				expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.optimization has an unknown property 'occurrenceOrder'. These properties are valid:
			   object { checkWasmTypes?, chunkIds?, concatenateModules?, emitOnErrors?, flagIncludedChunks?, innerGraph?, mangleExports?, mangleWasmImports?, mergeDuplicateChunks?, minimize?, minimizer?, moduleIds?, noEmitOnErrors?, nodeEnv?, portableRecords?, providedExports?, realContentHash?, removeAvailableModules?, removeEmptyChunks?, runtimeChunk?, sideEffects?, splitChunks?, usedExports? }
			   -> Enables/Disables integrated optimizations.
			   Did you mean optimization.chunkIds: \\"size\\" and optimization.moduleIds: \\"size\\" (BREAKING CHANGE since webpack 5)?"
		`)
		);
		createTestCase(
			"optimization.idHint",
			{
				optimization: {
					splitChunks: {
						automaticNamePrefix: "vendor"
					}
				}
			},
			msg =>
				expect(msg).toMatchInlineSnapshot(`
			"Invalid configuration object. Webpack has been initialized using a configuration object that does not match the API schema.
			 - configuration.optimization.splitChunks has an unknown property 'automaticNamePrefix'. These properties are valid:
			   object { automaticNameDelimiter?, cacheGroups?, chunks?, defaultSizeTypes?, enforceSizeThreshold?, fallbackCacheGroup?, filename?, hidePathInfo?, maxAsyncRequests?, maxAsyncSize?, maxInitialRequests?, maxInitialSize?, maxSize?, minChunks?, minRemainingSize?, minSize?, name?, usedExports? }
			   -> Options object for splitting chunks into smaller chunks."
		`)
		);
	});
});
