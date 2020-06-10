const jestDiff = require("jest-diff").default;
const stripAnsi = require("strip-ansi");
const {
	applyWebpackOptionsDefaults,
	getNormalizedWebpackOptions
} = require("..").config;

/**
 * Escapes regular expression metacharacters
 * @param {string} str String to quote
 * @returns {string} Escaped string
 */
const quotemeta = str => {
	return str.replace(/[-[\]\\/{}()*+?.^$|]/g, "\\$&");
};

describe("Defaults", () => {
	const cwd = process.cwd();
	const cwdRegExp = new RegExp(
		`${quotemeta(cwd)}((?:\\\\)?(?:[a-zA-Z.\\-_]+\\\\)*)`,
		"g"
	);
	const escapedCwd = JSON.stringify(cwd).slice(1, -1);
	const escapedCwdRegExp = new RegExp(
		`${quotemeta(escapedCwd)}((?:\\\\\\\\)?(?:[a-zA-Z.\\-_]+\\\\\\\\)*)`,
		"g"
	);
	const normalize = str => {
		if (cwd.startsWith("/")) {
			str = str.replace(new RegExp(quotemeta(cwd), "g"), "<cwd>");
		} else {
			str = str.replace(cwdRegExp, (m, g) => `<cwd>${g.replace(/\\/g, "/")}`);
			str = str.replace(
				escapedCwdRegExp,
				(m, g) => `<cwd>${g.replace(/\\\\/g, "/")}`
			);
		}
		str = str.replace(/@@ -\d+,\d+ \+\d+,\d+ @@/g, "@@ ... @@");
		return str;
	};

	class Diff {
		constructor(value) {
			this.value = value;
		}
	}

	expect.addSnapshotSerializer({
		test(value) {
			return value instanceof Diff;
		},
		print(received) {
			return normalize(received.value);
		}
	});

	expect.addSnapshotSerializer({
		test(value) {
			return typeof value === "string";
		},
		print(received) {
			return JSON.stringify(normalize(received));
		}
	});

	const getDefaultConfig = config => {
		config = getNormalizedWebpackOptions(config);
		applyWebpackOptionsDefaults(config);
		return config;
	};

	const baseConfig = getDefaultConfig({ mode: "none" });

	it("should have the correct base config", () => {
		expect(baseConfig).toMatchInlineSnapshot(`
		Object {
		  "amd": undefined,
		  "bail": undefined,
		  "cache": false,
		  "context": "<cwd>",
		  "dependencies": undefined,
		  "devServer": undefined,
		  "devtool": false,
		  "entry": Object {
		    "main": Object {
		      "import": Array [
		        "./src",
		      ],
		    },
		  },
		  "experiments": Object {
		    "asset": false,
		    "asyncWebAssembly": false,
		    "importAsync": false,
		    "importAwait": false,
		    "mjs": false,
		    "outputModule": false,
		    "syncWebAssembly": false,
		    "topLevelAwait": false,
		  },
		  "externals": undefined,
		  "externalsType": "var",
		  "infrastructureLogging": Object {
		    "debug": false,
		    "level": "info",
		  },
		  "loader": undefined,
		  "mode": "none",
		  "module": Object {
		    "defaultRules": Array [
		      Object {
		        "resolve": Object {},
		        "type": "javascript/auto",
		      },
		      Object {
		        "test": /\\\\\\.json\\$/i,
		        "type": "json",
		      },
		    ],
		    "exprContextCritical": true,
		    "exprContextRecursive": true,
		    "exprContextRegExp": false,
		    "exprContextRequest": ".",
		    "rules": Array [],
		    "strictExportPresence": false,
		    "strictThisContextOnImports": false,
		    "unknownContextCritical": true,
		    "unknownContextRecursive": true,
		    "unknownContextRegExp": false,
		    "unknownContextRequest": ".",
		    "unsafeCache": false,
		    "wrappedContextCritical": false,
		    "wrappedContextRecursive": true,
		    "wrappedContextRegExp": /\\.\\*/,
		  },
		  "name": undefined,
		  "node": Object {
		    "__dirname": "mock",
		    "__filename": "mock",
		    "global": true,
		  },
		  "optimization": Object {
		    "checkWasmTypes": false,
		    "chunkIds": "natural",
		    "concatenateModules": false,
		    "flagIncludedChunks": false,
		    "innerGraph": true,
		    "mangleExports": false,
		    "mangleWasmImports": false,
		    "mergeDuplicateChunks": true,
		    "minimize": false,
		    "minimizer": Array [
		      Object {
		        "apply": [Function],
		      },
		    ],
		    "moduleIds": "natural",
		    "noEmitOnErrors": false,
		    "nodeEnv": false,
		    "portableRecords": false,
		    "providedExports": true,
		    "removeAvailableModules": false,
		    "removeEmptyChunks": true,
		    "runtimeChunk": false,
		    "sideEffects": true,
		    "splitChunks": Object {
		      "automaticNameDelimiter": "-",
		      "cacheGroups": Object {
		        "default": Object {
		          "idHint": "",
		          "minChunks": 2,
		          "priority": -20,
		          "reuseExistingChunk": true,
		        },
		        "defaultVendors": Object {
		          "idHint": "vendors",
		          "priority": -10,
		          "reuseExistingChunk": true,
		          "test": /\\[\\\\\\\\/\\]node_modules\\[\\\\\\\\/\\]/i,
		        },
		      },
		      "chunks": "async",
		      "hidePathInfo": false,
		      "maxAsyncRequests": Infinity,
		      "maxInitialRequests": Infinity,
		      "minChunks": 1,
		      "minRemainingSize": undefined,
		      "minSize": 10000,
		    },
		    "usedExports": true,
		  },
		  "output": Object {
		    "assetModuleFilename": "[hash][ext]",
		    "chunkCallbackName": "webpackChunkwebpack",
		    "chunkFilename": "[name].js",
		    "chunkLoadTimeout": 120000,
		    "compareBeforeEmit": true,
		    "crossOriginLoading": false,
		    "devtoolFallbackModuleFilenameTemplate": undefined,
		    "devtoolModuleFilenameTemplate": undefined,
		    "devtoolNamespace": "webpack",
		    "ecmaVersion": 6,
		    "enabledLibraryTypes": Array [],
		    "filename": "[name].js",
		    "globalObject": "window",
		    "hashDigest": "hex",
		    "hashDigestLength": 20,
		    "hashFunction": "md4",
		    "hashSalt": undefined,
		    "hotUpdateChunkFilename": "[id].[fullhash].hot-update.js",
		    "hotUpdateFunction": "webpackHotUpdatewebpack",
		    "hotUpdateMainFilename": "[fullhash].hot-update.json",
		    "iife": true,
		    "importFunctionName": "import",
		    "jsonpFunction": "webpackJsonpwebpack",
		    "jsonpScriptType": false,
		    "library": undefined,
		    "libraryTarget": "var",
		    "module": false,
		    "path": "<cwd>/dist",
		    "pathinfo": false,
		    "publicPath": "",
		    "sourceMapFilename": "[file].map[query]",
		    "sourcePrefix": undefined,
		    "strictModuleExceptionHandling": false,
		    "uniqueName": "webpack",
		    "webassemblyModuleFilename": "[hash].module.wasm",
		  },
		  "parallelism": 100,
		  "performance": false,
		  "plugins": Array [],
		  "profile": false,
		  "recordsInputPath": false,
		  "recordsOutputPath": false,
		  "resolve": Object {
		    "aliasFields": Array [
		      "browser",
		    ],
		    "cache": false,
		    "extensions": Array [
		      ".js",
		      ".json",
		      ".wasm",
		    ],
		    "mainFields": Array [
		      "browser",
		      "module",
		      "main",
		    ],
		    "mainFiles": Array [
		      "index",
		    ],
		    "modules": Array [
		      "node_modules",
		    ],
		  },
		  "resolveLoader": Object {
		    "cache": false,
		    "extensions": Array [
		      ".js",
		    ],
		    "mainFields": Array [
		      "loader",
		      "main",
		    ],
		    "mainFiles": Array [
		      "index",
		    ],
		  },
		  "stats": Object {},
		  "target": "web",
		  "watch": false,
		  "watchOptions": Object {},
		}
	`);
	});

	const test = (name, options, fn) => {
		it(`should generate the correct defaults from ${name}`, () => {
			if (!("mode" in options)) options.mode = "none";
			const result = getDefaultConfig(options);

			const diff = stripAnsi(
				jestDiff(baseConfig, result, { expand: false, contextLines: 0 })
			);

			fn(expect(new Diff(diff)), expect(result));
		});
	};

	test("empty config", {}, e =>
		e.toMatchInlineSnapshot(`Compared values have no visual difference.`)
	);
	test("none mode", { mode: "none" }, e =>
		e.toMatchInlineSnapshot(`Compared values have no visual difference.`)
	);
	test("no mode provided", { mode: undefined }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-   "mode": "none",
		+   "mode": undefined,
		@@ ... @@
		-     "checkWasmTypes": false,
		-     "chunkIds": "natural",
		-     "concatenateModules": false,
		-     "flagIncludedChunks": false,
		+     "checkWasmTypes": true,
		+     "chunkIds": "deterministic",
		+     "concatenateModules": true,
		+     "flagIncludedChunks": true,
		@@ ... @@
		-     "mangleExports": false,
		+     "mangleExports": true,
		@@ ... @@
		-     "minimize": false,
		+     "minimize": true,
		@@ ... @@
		-     "moduleIds": "natural",
		-     "noEmitOnErrors": false,
		-     "nodeEnv": false,
		+     "moduleIds": "deterministic",
		+     "noEmitOnErrors": true,
		+     "nodeEnv": "production",
		@@ ... @@
		-       "hidePathInfo": false,
		-       "maxAsyncRequests": Infinity,
		-       "maxInitialRequests": Infinity,
		+       "hidePathInfo": true,
		+       "maxAsyncRequests": 6,
		+       "maxInitialRequests": 4,
		@@ ... @@
		-       "minSize": 10000,
		+       "minSize": 30000,
		@@ ... @@
		-   "performance": false,
		+   "performance": Object {
		+     "hints": "warning",
		+     "maxAssetSize": 250000,
		+     "maxEntrypointSize": 250000,
		+   },
	`)
	);
	test("production", { mode: "production" }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-   "mode": "none",
		+   "mode": "production",
		@@ ... @@
		-     "checkWasmTypes": false,
		-     "chunkIds": "natural",
		-     "concatenateModules": false,
		-     "flagIncludedChunks": false,
		+     "checkWasmTypes": true,
		+     "chunkIds": "deterministic",
		+     "concatenateModules": true,
		+     "flagIncludedChunks": true,
		@@ ... @@
		-     "mangleExports": false,
		+     "mangleExports": true,
		@@ ... @@
		-     "minimize": false,
		+     "minimize": true,
		@@ ... @@
		-     "moduleIds": "natural",
		-     "noEmitOnErrors": false,
		-     "nodeEnv": false,
		+     "moduleIds": "deterministic",
		+     "noEmitOnErrors": true,
		+     "nodeEnv": "production",
		@@ ... @@
		-       "hidePathInfo": false,
		-       "maxAsyncRequests": Infinity,
		-       "maxInitialRequests": Infinity,
		+       "hidePathInfo": true,
		+       "maxAsyncRequests": 6,
		+       "maxInitialRequests": 4,
		@@ ... @@
		-       "minSize": 10000,
		+       "minSize": 30000,
		@@ ... @@
		-   "performance": false,
		+   "performance": Object {
		+     "hints": "warning",
		+     "maxAssetSize": 250000,
		+     "maxEntrypointSize": 250000,
		+   },
	`)
	);
	test("development", { mode: "development" }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-   "cache": false,
		+   "cache": Object {
		+     "immutablePaths": Array [],
		+     "managedPaths": Array [
		+       "<cwd>/node_modules",
		+     ],
		+     "type": "memory",
		+   },
		@@ ... @@
		-   "devtool": false,
		+   "devtool": "eval",
		@@ ... @@
		-   "mode": "none",
		+   "mode": "development",
		@@ ... @@
		-     "unsafeCache": false,
		+     "unsafeCache": [Function anonymous],
		@@ ... @@
		-     "chunkIds": "natural",
		+     "chunkIds": "named",
		@@ ... @@
		-     "moduleIds": "natural",
		+     "moduleIds": "named",
		@@ ... @@
		-     "nodeEnv": false,
		+     "nodeEnv": "development",
		@@ ... @@
		-       "minRemainingSize": undefined,
		+       "minRemainingSize": 0,
		@@ ... @@
		-     "pathinfo": false,
		+     "pathinfo": true,
		@@ ... @@
		-     "cache": false,
		+     "cache": true,
		@@ ... @@
		-     "cache": false,
		+     "cache": true,
	`)
	);
	test("sync wasm", { experiments: { syncWebAssembly: true } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "syncWebAssembly": false,
		+     "syncWebAssembly": true,
		@@ ... @@
		+       },
		+       Object {
		+         "test": /\\.wasm$/i,
		+         "type": "webassembly/sync",
	`)
	);
	test("mjs", { experiments: { mjs: true } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "mjs": false,
		+     "mjs": true,
		@@ ... @@
		+       Object {
		+         "resolve": Object {
		+           "mainFields": Array [
		+             "browser",
		+             "main",
		@@ ... @@
		+         },
		+         "test": /\\.mjs$/i,
		+         "type": "javascript/esm",
		+       },
		+     ],
		@@ ... @@
		+       ".mjs",
	`)
	);
	test("output module", { experiments: { outputModule: true } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "outputModule": false,
		+     "outputModule": true,
		@@ ... @@
		-   "externalsType": "var",
		+   "externalsType": "module",
		@@ ... @@
		-     "iife": true,
		+     "iife": false,
		@@ ... @@
		-     "jsonpScriptType": false,
		+     "jsonpScriptType": "module",
		@@ ... @@
		-     "libraryTarget": "var",
		-     "module": false,
		+     "libraryTarget": "module",
		+     "module": true,
	`)
	);
	test("async wasm", { experiments: { asyncWebAssembly: true } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "asyncWebAssembly": false,
		+     "asyncWebAssembly": true,
		@@ ... @@
		+       },
		+       Object {
		+         "test": /\\.wasm$/i,
		+         "type": "webassembly/async",
	`)
	);
	test(
		"both wasm",
		{ experiments: { syncWebAssembly: true, asyncWebAssembly: true } },
		e =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-     "asyncWebAssembly": false,
			+     "asyncWebAssembly": true,
			@@ ... @@
			-     "syncWebAssembly": false,
			+     "syncWebAssembly": true,
			@@ ... @@
			+       },
			+       Object {
			+         "test": /\\.wasm$/i,
			+         "type": "webassembly/async",
		`)
	);
	test("const filename", { output: { filename: "bundle.js" } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "chunkFilename": "[name].js",
		+     "chunkFilename": "[id].bundle.js",
		@@ ... @@
		-     "filename": "[name].js",
		+     "filename": "bundle.js",
	`)
	);
	test("function filename", { output: { filename: () => "bundle.js" } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "chunkFilename": "[name].js",
		+     "chunkFilename": "[id].js",
		@@ ... @@
		-     "filename": "[name].js",
		+     "filename": [Function filename],
	`)
	);
	test("library", { output: { library: ["myLib", "awesome"] } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "chunkCallbackName": "webpackChunkwebpack",
		+     "chunkCallbackName": "webpackChunkmyLib_awesome",
		@@ ... @@
		-     "devtoolNamespace": "webpack",
		+     "devtoolNamespace": "myLib.awesome",
		@@ ... @@
		-     "enabledLibraryTypes": Array [],
		+     "enabledLibraryTypes": Array [
		+       "var",
		+     ],
		@@ ... @@
		-     "hotUpdateFunction": "webpackHotUpdatewebpack",
		+     "hotUpdateFunction": "webpackHotUpdatemyLib_awesome",
		@@ ... @@
		-     "jsonpFunction": "webpackJsonpwebpack",
		+     "jsonpFunction": "webpackJsonpmyLib_awesome",
		@@ ... @@
		-     "library": undefined,
		+     "library": Object {
		+       "auxiliaryComment": undefined,
		+       "export": undefined,
		+       "name": Array [
		+         "myLib",
		+         "awesome",
		+       ],
		+       "type": "var",
		+       "umdNamedDefine": undefined,
		+     },
		@@ ... @@
		-     "uniqueName": "webpack",
		+     "uniqueName": "myLib.awesome",
	`)
	);
	test("target node", { target: "node" }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "__dirname": "mock",
		-     "__filename": "mock",
		-     "global": true,
		+     "__dirname": false,
		+     "__filename": false,
		+     "global": false,
		@@ ... @@
		-     "globalObject": "window",
		+     "globalObject": "global",
		@@ ... @@
		-     "aliasFields": Array [
		-       "browser",
		-     ],
		+     "aliasFields": Array [],
		@@ ... @@
		-       "browser",
		@@ ... @@
		-   "target": "web",
		+   "target": "node",
	`)
	);
	test("target webworker", { target: "webworker" }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "globalObject": "window",
		+     "globalObject": "self",
		@@ ... @@
		-   "target": "web",
		+   "target": "webworker",
	`)
	);
	test("records", { recordsPath: "some-path" }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "portableRecords": false,
		+     "portableRecords": true,
		@@ ... @@
		-   "recordsInputPath": false,
		-   "recordsOutputPath": false,
		+   "recordsInputPath": "some-path",
		+   "recordsOutputPath": "some-path",
	`)
	);
	test("ecamVersion", { output: { ecmaVersion: 2020 } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "ecmaVersion": 6,
		+     "ecmaVersion": 11,
	`)
	);
	test("single runtimeChunk", { optimization: { runtimeChunk: "single" } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "runtimeChunk": false,
		+     "runtimeChunk": Object {
		+       "name": [Function name],
		+     },
	`)
	);
	test(
		"single runtimeChunk",
		{ optimization: { runtimeChunk: "multiple" } },
		e =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-     "runtimeChunk": false,
			+     "runtimeChunk": Object {
			+       "name": [Function name],
			+     },
		`)
	);
	test("single runtimeChunk", { optimization: { runtimeChunk: true } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "runtimeChunk": false,
		+     "runtimeChunk": Object {
		+       "name": [Function name],
		+     },
	`)
	);
	test("cache true", { cache: true }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-   "cache": false,
		+   "cache": Object {
		+     "immutablePaths": Array [],
		+     "managedPaths": Array [
		+       "<cwd>/node_modules",
		+     ],
		+     "type": "memory",
		+   },
		@@ ... @@
		-     "unsafeCache": false,
		+     "unsafeCache": [Function anonymous],
		@@ ... @@
		-     "cache": false,
		+     "cache": true,
		@@ ... @@
		-     "cache": false,
		+     "cache": true,
	`)
	);
	test("cache filesystem", { cache: { type: "filesystem" } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-   "cache": false,
		+   "cache": Object {
		+     "buildDependencies": Object {
		+       "defaultWebpack": Array [
		+         "<cwd>/lib/",
		+       ],
		+     },
		+     "cacheDirectory": "<cwd>/node_modules/.cache/webpack",
		+     "cacheLocation": "<cwd>/node_modules/.cache/webpack/default-none",
		+     "hashAlgorithm": "md4",
		+     "idleTimeout": 60000,
		+     "idleTimeoutForInitialStore": 0,
		+     "immutablePaths": Array [],
		+     "managedPaths": Array [
		+       "<cwd>/node_modules",
		+     ],
		+     "name": "default-none",
		+     "store": "pack",
		+     "type": "filesystem",
		+     "version": "",
		+   },
		@@ ... @@
		-     "unsafeCache": false,
		+     "unsafeCache": [Function anonymous],
		@@ ... @@
		-     "cache": false,
		+     "cache": true,
		@@ ... @@
		-     "cache": false,
		+     "cache": true,
	`)
	);

	test(
		"disable",
		{
			cache: false,
			node: false,
			amd: false,
			optimization: { splitChunks: false }
		},
		e =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-   "amd": undefined,
			+   "amd": false,
			@@ ... @@
			-   "node": Object {
			-     "__dirname": "mock",
			-     "__filename": "mock",
			-     "global": true,
			-   },
			+   "node": false,
			@@ ... @@
			-     "splitChunks": Object {
			-       "automaticNameDelimiter": "-",
			-       "cacheGroups": Object {
			-         "default": Object {
			-           "idHint": "",
			-           "minChunks": 2,
			-           "priority": -20,
			-           "reuseExistingChunk": true,
			-         },
			-         "defaultVendors": Object {
			-           "idHint": "vendors",
			-           "priority": -10,
			-           "reuseExistingChunk": true,
			-           "test": /[\\\\/]node_modules[\\\\/]/i,
			-         },
			-       },
			-       "chunks": "async",
			-       "hidePathInfo": false,
			-       "maxAsyncRequests": Infinity,
			-       "maxInitialRequests": Infinity,
			-       "minChunks": 1,
			-       "minRemainingSize": undefined,
			-       "minSize": 10000,
			-     },
			+     "splitChunks": false,
		`)
	);

	test(
		"uniqueName",
		{
			output: {
				uniqueName: "@@@Hello World!"
			}
		},
		e =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-     "chunkCallbackName": "webpackChunkwebpack",
			+     "chunkCallbackName": "webpackChunk_Hello_World_",
			@@ ... @@
			-     "devtoolNamespace": "webpack",
			+     "devtoolNamespace": "@@@Hello World!",
			@@ ... @@
			-     "hotUpdateFunction": "webpackHotUpdatewebpack",
			+     "hotUpdateFunction": "webpackHotUpdate_Hello_World_",
			@@ ... @@
			-     "jsonpFunction": "webpackJsonpwebpack",
			+     "jsonpFunction": "webpackJsonp_Hello_World_",
			@@ ... @@
			-     "uniqueName": "webpack",
			+     "uniqueName": "@@@Hello World!",
		`)
	);
});
