const jestDiff = require("jest-diff");
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
	const normalizeCwd = str => {
		if (cwd.startsWith("/")) {
			str = str.replace(new RegExp(quotemeta(cwd), "g"), "<cwd>");
		} else {
			str = str.replace(cwdRegExp, (m, g) => `<cwd>${g.replace(/\\/g, "/")}`);
			str = str.replace(
				escapedCwdRegExp,
				(m, g) => `<cwd>${g.replace(/\\\\/g, "/")}`
			);
		}
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
			return normalizeCwd(received.value);
		}
	});

	expect.addSnapshotSerializer({
		test(value) {
			return typeof value === "string";
		},
		print(received) {
			return JSON.stringify(normalizeCwd(received));
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
		    "chunkCallbackName": "webpackChunk",
		    "chunkFilename": "[name].js",
		    "chunkLoadTimeout": 120000,
		    "compareBeforeEmit": true,
		    "crossOriginLoading": false,
		    "devtoolNamespace": "",
		    "ecmaVersion": 6,
		    "filename": "[name].js",
		    "globalObject": "window",
		    "hashDigest": "hex",
		    "hashDigestLength": 20,
		    "hashFunction": "md4",
		    "hotUpdateChunkFilename": "[id].[fullhash].hot-update.js",
		    "hotUpdateFunction": "webpackHotUpdate",
		    "hotUpdateMainFilename": "[fullhash].hot-update.json",
		    "iife": true,
		    "jsonpFunction": "webpackJsonp",
		    "jsonpScriptType": false,
		    "library": "",
		    "libraryTarget": "var",
		    "module": false,
		    "path": "<cwd>/dist",
		    "pathinfo": false,
		    "publicPath": "",
		    "sourceMapFilename": "[file].map[query]",
		    "strictModuleExceptionHandling": false,
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
		  "serve": undefined,
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

		@@ -32,1 +32,1 @@
		-   "mode": "none",
		+   "mode": undefined,
		@@ -67,4 +67,4 @@
		-     "checkWasmTypes": false,
		-     "chunkIds": "natural",
		-     "concatenateModules": false,
		-     "flagIncludedChunks": false,
		+     "checkWasmTypes": true,
		+     "chunkIds": "deterministic",
		+     "concatenateModules": true,
		+     "flagIncludedChunks": true,
		@@ -72,1 +72,1 @@
		-     "mangleExports": false,
		+     "mangleExports": true,
		@@ -75,1 +75,1 @@
		-     "minimize": false,
		+     "minimize": true,
		@@ -81,3 +81,3 @@
		-     "moduleIds": "natural",
		-     "noEmitOnErrors": false,
		-     "nodeEnv": false,
		+     "moduleIds": "deterministic",
		+     "noEmitOnErrors": true,
		+     "nodeEnv": "production",
		@@ -107,3 +107,3 @@
		-       "hidePathInfo": false,
		-       "maxAsyncRequests": Infinity,
		-       "maxInitialRequests": Infinity,
		+       "hidePathInfo": true,
		+       "maxAsyncRequests": 6,
		+       "maxInitialRequests": 4,
		@@ -112,1 +112,1 @@
		-       "minSize": 10000,
		+       "minSize": 30000,
		@@ -147,1 +147,5 @@
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

		@@ -32,1 +32,1 @@
		-   "mode": "none",
		+   "mode": "production",
		@@ -67,4 +67,4 @@
		-     "checkWasmTypes": false,
		-     "chunkIds": "natural",
		-     "concatenateModules": false,
		-     "flagIncludedChunks": false,
		+     "checkWasmTypes": true,
		+     "chunkIds": "deterministic",
		+     "concatenateModules": true,
		+     "flagIncludedChunks": true,
		@@ -72,1 +72,1 @@
		-     "mangleExports": false,
		+     "mangleExports": true,
		@@ -75,1 +75,1 @@
		-     "minimize": false,
		+     "minimize": true,
		@@ -81,3 +81,3 @@
		-     "moduleIds": "natural",
		-     "noEmitOnErrors": false,
		-     "nodeEnv": false,
		+     "moduleIds": "deterministic",
		+     "noEmitOnErrors": true,
		+     "nodeEnv": "production",
		@@ -107,3 +107,3 @@
		-       "hidePathInfo": false,
		-       "maxAsyncRequests": Infinity,
		-       "maxInitialRequests": Infinity,
		+       "hidePathInfo": true,
		+       "maxAsyncRequests": 6,
		+       "maxInitialRequests": 4,
		@@ -112,1 +112,1 @@
		-       "minSize": 10000,
		+       "minSize": 30000,
		@@ -147,1 +147,5 @@
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

		@@ -4,1 +4,7 @@
		-   "cache": false,
		+   "cache": Object {
		+     "immutablePaths": Array [],
		+     "managedPaths": Array [
		+       "<cwd>/node_modules",
		+     ],
		+     "type": "memory",
		+   },
		@@ -8,1 +14,1 @@
		-   "devtool": false,
		+   "devtool": "eval",
		@@ -32,1 +38,1 @@
		-   "mode": "none",
		+   "mode": "development",
		@@ -55,1 +61,1 @@
		-     "unsafeCache": false,
		+     "unsafeCache": [Function anonymous],
		@@ -68,1 +74,1 @@
		-     "chunkIds": "natural",
		+     "chunkIds": "named",
		@@ -81,1 +87,1 @@
		-     "moduleIds": "natural",
		+     "moduleIds": "named",
		@@ -83,1 +89,1 @@
		-     "nodeEnv": false,
		+     "nodeEnv": "development",
		@@ -111,1 +117,1 @@
		-       "minRemainingSize": undefined,
		+       "minRemainingSize": 0,
		@@ -140,1 +146,1 @@
		-     "pathinfo": false,
		+     "pathinfo": true,
		@@ -156,1 +162,1 @@
		-     "cache": false,
		+     "cache": true,
		@@ -175,1 +181,1 @@
		-     "cache": false,
		+     "cache": true,
	`)
	);
	test("sync wasm", { experiments: { syncWebAssembly: true } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -23,1 +23,1 @@
		-     "syncWebAssembly": false,
		+     "syncWebAssembly": true,
		@@ -42,0 +42,4 @@
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

		@@ -21,1 +21,1 @@
		-     "mjs": false,
		+     "mjs": true,
		@@ -43,0 +43,5 @@
		+       Object {
		+         "resolve": Object {
		+           "mainFields": Array [
		+             "browser",
		+             "main",
		@@ -44,0 +49,5 @@
		+         },
		+         "test": /\\.mjs$/i,
		+         "type": "javascript/esm",
		+       },
		+     ],
		@@ -158,0 +168,1 @@
		+       ".mjs",
	`)
	);
	test("output module", { experiments: { outputModule: true } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -22,1 +22,1 @@
		-     "outputModule": false,
		+     "outputModule": true,
		@@ -133,1 +133,1 @@
		-     "iife": true,
		+     "iife": false,
		@@ -135,1 +135,1 @@
		-     "jsonpScriptType": false,
		+     "jsonpScriptType": "module",
		@@ -137,2 +137,2 @@
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

		@@ -18,1 +18,1 @@
		-     "asyncWebAssembly": false,
		+     "asyncWebAssembly": true,
		@@ -42,0 +42,4 @@
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

			@@ -18,1 +18,1 @@
			-     "asyncWebAssembly": false,
			+     "asyncWebAssembly": true,
			@@ -23,1 +23,1 @@
			-     "syncWebAssembly": false,
			+     "syncWebAssembly": true,
			@@ -42,0 +42,4 @@
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

		@@ -119,1 +119,1 @@
		-     "chunkFilename": "[name].js",
		+     "chunkFilename": "[id].bundle.js",
		@@ -125,1 +125,1 @@
		-     "filename": "[name].js",
		+     "filename": "bundle.js",
	`)
	);
	test("function filename", { output: { filename: () => "bundle.js" } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -119,1 +119,1 @@
		-     "chunkFilename": "[name].js",
		+     "chunkFilename": "[id].js",
		@@ -125,1 +125,1 @@
		-     "filename": "[name].js",
		+     "filename": [Function filename],
	`)
	);
	test("library", { output: { library: ["myLib", "awesome"] } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -118,1 +118,1 @@
		-     "chunkCallbackName": "webpackChunk",
		+     "chunkCallbackName": "webpackChunkmyLib_awesome",
		@@ -123,1 +123,1 @@
		-     "devtoolNamespace": "",
		+     "devtoolNamespace": "myLib.awesome",
		@@ -131,1 +131,1 @@
		-     "hotUpdateFunction": "webpackHotUpdate",
		+     "hotUpdateFunction": "webpackHotUpdatemyLib_awesome",
		@@ -134,1 +134,1 @@
		-     "jsonpFunction": "webpackJsonp",
		+     "jsonpFunction": "webpackJsonpmyLib_awesome",
		@@ -136,1 +136,4 @@
		-     "library": "",
		+     "library": Array [
		+       "myLib",
		+       "awesome",
		+     ],
	`)
	);
	test("target node", { target: "node" }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -62,3 +62,3 @@
		-     "__dirname": "mock",
		-     "__filename": "mock",
		-     "global": true,
		+     "__dirname": false,
		+     "__filename": false,
		+     "global": false,
		@@ -126,1 +126,1 @@
		-     "globalObject": "window",
		+     "globalObject": "global",
		@@ -153,3 +153,1 @@
		-     "aliasFields": Array [
		-       "browser",
		-     ],
		+     "aliasFields": Array [],
		@@ -163,1 +161,0 @@
		-       "browser",
		@@ -189,1 +186,1 @@
		-   "target": "web",
		+   "target": "node",
	`)
	);
	test("target webworker", { target: "webworker" }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -126,1 +126,1 @@
		-     "globalObject": "window",
		+     "globalObject": "self",
		@@ -189,1 +189,1 @@
		-   "target": "web",
		+   "target": "webworker",
	`)
	);
	test("records", { recordsPath: "some-path" }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -84,1 +84,1 @@
		-     "portableRecords": false,
		+     "portableRecords": true,
		@@ -150,2 +150,2 @@
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

		@@ -124,1 +124,1 @@
		-     "ecmaVersion": 6,
		+     "ecmaVersion": 11,
	`)
	);
	test("single runtimeChunk", { optimization: { runtimeChunk: "single" } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -88,1 +88,3 @@
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

			@@ -88,1 +88,3 @@
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

		@@ -88,1 +88,3 @@
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

		@@ -4,1 +4,7 @@
		-   "cache": false,
		+   "cache": Object {
		+     "immutablePaths": Array [],
		+     "managedPaths": Array [
		+       "<cwd>/node_modules",
		+     ],
		+     "type": "memory",
		+   },
		@@ -55,1 +61,1 @@
		-     "unsafeCache": false,
		+     "unsafeCache": [Function anonymous],
		@@ -156,1 +162,1 @@
		-     "cache": false,
		+     "cache": true,
		@@ -175,1 +181,1 @@
		-     "cache": false,
		+     "cache": true,
	`)
	);
	test("cache filesystem", { cache: { type: "filesystem" } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -4,1 +4,20 @@
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
		@@ -55,1 +74,1 @@
		-     "unsafeCache": false,
		+     "unsafeCache": [Function anonymous],
		@@ -156,1 +175,1 @@
		-     "cache": false,
		+     "cache": true,
		@@ -175,1 +194,1 @@
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

			@@ -2,1 +2,1 @@
			-   "amd": undefined,
			+   "amd": false,
			@@ -61,5 +61,1 @@
			-   "node": Object {
			-     "__dirname": "mock",
			-     "__filename": "mock",
			-     "global": true,
			-   },
			+   "node": false,
			@@ -90,24 +86,1 @@
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
});
