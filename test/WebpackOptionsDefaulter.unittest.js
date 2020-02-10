const jestDiff = require("jest-diff");
const stripAnsi = require("strip-ansi");
const WebpackOptionsDefaulter = require("../lib/WebpackOptionsDefaulter");

/**
 * Escapes regular expression metacharacters
 * @param {string} str String to quote
 * @returns {string} Escaped string
 */
const quotemeta = str => {
	return str.replace(/[-[\]\\/{}()*+?.^$|]/g, "\\$&");
};

describe("WebpackOptionsDefaulter", () => {
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

	const getDefaultConfig = config =>
		new WebpackOptionsDefaulter().process(config);

	const baseConfig = getDefaultConfig({ mode: "none" });

	it("should have the correct base config", () => {
		expect(baseConfig).toMatchInlineSnapshot(`
		Object {
		  "cache": false,
		  "context": "<cwd>",
		  "devtool": false,
		  "entry": "./src",
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
		  "infrastructureLogging": Object {
		    "debug": false,
		    "level": "info",
		  },
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
		    "unsafeCache": undefined,
		    "wrappedContextCritical": false,
		    "wrappedContextRecursive": true,
		    "wrappedContextRegExp": /\\.\\*/,
		  },
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
		    "runtimeChunk": undefined,
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
		  "performance": false,
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
		  "target": "web",
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

		@@ -20,1 +20,1 @@
		-   "mode": "none",
		+   "mode": undefined,
		@@ -54,4 +54,4 @@
		-     "checkWasmTypes": false,
		-     "chunkIds": "natural",
		-     "concatenateModules": false,
		-     "flagIncludedChunks": false,
		+     "checkWasmTypes": true,
		+     "chunkIds": "deterministic",
		+     "concatenateModules": true,
		+     "flagIncludedChunks": true,
		@@ -59,1 +59,1 @@
		-     "mangleExports": false,
		+     "mangleExports": true,
		@@ -62,1 +62,1 @@
		-     "minimize": false,
		+     "minimize": true,
		@@ -68,3 +68,3 @@
		-     "moduleIds": "natural",
		-     "noEmitOnErrors": false,
		-     "nodeEnv": false,
		+     "moduleIds": "deterministic",
		+     "noEmitOnErrors": true,
		+     "nodeEnv": "production",
		@@ -94,3 +94,3 @@
		-       "hidePathInfo": false,
		-       "maxAsyncRequests": Infinity,
		-       "maxInitialRequests": Infinity,
		+       "hidePathInfo": true,
		+       "maxAsyncRequests": 6,
		+       "maxInitialRequests": 4,
		@@ -99,1 +99,1 @@
		-       "minSize": 10000,
		+       "minSize": 30000,
		@@ -133,1 +133,5 @@
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

		@@ -20,1 +20,1 @@
		-   "mode": "none",
		+   "mode": "production",
		@@ -54,4 +54,4 @@
		-     "checkWasmTypes": false,
		-     "chunkIds": "natural",
		-     "concatenateModules": false,
		-     "flagIncludedChunks": false,
		+     "checkWasmTypes": true,
		+     "chunkIds": "deterministic",
		+     "concatenateModules": true,
		+     "flagIncludedChunks": true,
		@@ -59,1 +59,1 @@
		-     "mangleExports": false,
		+     "mangleExports": true,
		@@ -62,1 +62,1 @@
		-     "minimize": false,
		+     "minimize": true,
		@@ -68,3 +68,3 @@
		-     "moduleIds": "natural",
		-     "noEmitOnErrors": false,
		-     "nodeEnv": false,
		+     "moduleIds": "deterministic",
		+     "noEmitOnErrors": true,
		+     "nodeEnv": "production",
		@@ -94,3 +94,3 @@
		-       "hidePathInfo": false,
		-       "maxAsyncRequests": Infinity,
		-       "maxInitialRequests": Infinity,
		+       "hidePathInfo": true,
		+       "maxAsyncRequests": 6,
		+       "maxInitialRequests": 4,
		@@ -99,1 +99,1 @@
		-       "minSize": 10000,
		+       "minSize": 30000,
		@@ -133,1 +133,5 @@
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

		@@ -2,1 +2,7 @@
		-   "cache": false,
		+   "cache": Object {
		+     "immutablePaths": undefined,
		+     "managedPaths": Array [
		+       "<cwd>/node_modules",
		+     ],
		+     "type": "memory",
		+   },
		@@ -4,1 +10,1 @@
		-   "devtool": false,
		+   "devtool": "eval",
		@@ -20,1 +26,1 @@
		-   "mode": "none",
		+   "mode": "development",
		@@ -43,1 +49,1 @@
		-     "unsafeCache": undefined,
		+     "unsafeCache": [Function anonymous],
		@@ -55,1 +61,1 @@
		-     "chunkIds": "natural",
		+     "chunkIds": "named",
		@@ -68,1 +74,1 @@
		-     "moduleIds": "natural",
		+     "moduleIds": "named",
		@@ -70,1 +76,1 @@
		-     "nodeEnv": false,
		+     "nodeEnv": "development",
		@@ -98,1 +104,1 @@
		-       "minRemainingSize": undefined,
		+       "minRemainingSize": 0,
		@@ -127,1 +133,1 @@
		-     "pathinfo": false,
		+     "pathinfo": true,
		@@ -138,1 +144,1 @@
		-     "cache": false,
		+     "cache": true,
		@@ -157,1 +163,1 @@
		-     "cache": false,
		+     "cache": true,
	`)
	);
	test("sync wasm", { experiments: { syncWebAssembly: true } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -13,1 +13,1 @@
		-     "syncWebAssembly": false,
		+     "syncWebAssembly": true,
		@@ -30,0 +30,4 @@
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

		@@ -11,1 +11,1 @@
		-     "mjs": false,
		+     "mjs": true,
		@@ -28,0 +28,10 @@
		+         "resolve": Object {
		+           "mainFields": Array [
		+             "browser",
		+             "main",
		+           ],
		+         },
		+         "test": /\\.mjs$/i,
		+         "type": "javascript/esm",
		+       },
		+       Object {
		@@ -140,0 +150,1 @@
		+       ".mjs",
	`)
	);
	test("output module", { experiments: { outputModule: true } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -12,1 +12,1 @@
		-     "outputModule": false,
		+     "outputModule": true,
		@@ -120,1 +120,1 @@
		-     "iife": true,
		+     "iife": false,
		@@ -122,1 +122,1 @@
		-     "jsonpScriptType": false,
		+     "jsonpScriptType": "module",
		@@ -124,2 +124,2 @@
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

		@@ -8,1 +8,1 @@
		-     "asyncWebAssembly": false,
		+     "asyncWebAssembly": true,
		@@ -30,0 +30,4 @@
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

			@@ -8,1 +8,1 @@
			-     "asyncWebAssembly": false,
			+     "asyncWebAssembly": true,
			@@ -13,1 +13,1 @@
			-     "syncWebAssembly": false,
			+     "syncWebAssembly": true,
			@@ -30,0 +30,8 @@
			+       },
			+       Object {
			+         "test": /\\.wasm$/i,
			+         "type": "webassembly/sync",
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

		@@ -106,1 +106,1 @@
		-     "chunkFilename": "[name].js",
		+     "chunkFilename": "[id].bundle.js",
		@@ -112,1 +112,1 @@
		-     "filename": "[name].js",
		+     "filename": "bundle.js",
	`)
	);
	test("function filename", { output: { filename: () => "bundle.js" } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -106,1 +106,1 @@
		-     "chunkFilename": "[name].js",
		+     "chunkFilename": "[id].js",
		@@ -112,1 +112,1 @@
		-     "filename": "[name].js",
		+     "filename": [Function filename],
	`)
	);
	test("library", { output: { library: ["myLib", "awesome"] } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -105,1 +105,1 @@
		-     "chunkCallbackName": "webpackChunk",
		+     "chunkCallbackName": "webpackChunkmyLib_awesome",
		@@ -110,1 +110,1 @@
		-     "devtoolNamespace": "",
		+     "devtoolNamespace": "myLib.awesome",
		@@ -118,1 +118,1 @@
		-     "hotUpdateFunction": "webpackHotUpdate",
		+     "hotUpdateFunction": "webpackHotUpdatemyLib_awesome",
		@@ -121,1 +121,1 @@
		-     "jsonpFunction": "webpackJsonp",
		+     "jsonpFunction": "webpackJsonpmyLib_awesome",
		@@ -123,1 +123,4 @@
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

		@@ -49,3 +49,3 @@
		-     "__dirname": "mock",
		-     "__filename": "mock",
		-     "global": true,
		+     "__dirname": false,
		+     "__filename": false,
		+     "global": false,
		@@ -113,1 +113,1 @@
		-     "globalObject": "window",
		+     "globalObject": "global",
		@@ -135,3 +135,1 @@
		-     "aliasFields": Array [
		-       "browser",
		-     ],
		+     "aliasFields": Array [],
		@@ -145,1 +143,0 @@
		-       "browser",
		@@ -169,1 +166,1 @@
		-   "target": "web",
		+   "target": "node",
	`)
	);
	test("target webworker", { target: "webworker" }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -113,1 +113,1 @@
		-     "globalObject": "window",
		+     "globalObject": "self",
		@@ -169,1 +169,1 @@
		-   "target": "web",
		+   "target": "webworker",
	`)
	);
	test("records", { recordsPath: "some-path" }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -71,1 +71,1 @@
		-     "portableRecords": false,
		+     "portableRecords": true,
		@@ -134,0 +134,1 @@
		+   "recordsPath": "some-path",
	`)
	);
	test("ecamVersion", { output: { ecmaVersion: 2020 } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -111,1 +111,1 @@
		-     "ecmaVersion": 6,
		+     "ecmaVersion": 11,
	`)
	);
	test("single runtimeChunk", { optimization: { runtimeChunk: "single" } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -75,1 +75,3 @@
		-     "runtimeChunk": undefined,
		+     "runtimeChunk": Object {
		+       "name": "runtime",
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

			@@ -75,1 +75,3 @@
			-     "runtimeChunk": undefined,
			+     "runtimeChunk": Object {
			+       "name": [Function name],
			+     },
		`)
	);
	test("single runtimeChunk", { optimization: { runtimeChunk: true } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -75,1 +75,3 @@
		-     "runtimeChunk": undefined,
		+     "runtimeChunk": Object {
		+       "name": [Function name],
		+     },
	`)
	);
	test("output shortcut", { output: "bundle.js" }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -106,1 +106,1 @@
		-     "chunkFilename": "[name].js",
		+     "chunkFilename": "[id].bundle.js",
		@@ -112,1 +112,1 @@
		-     "filename": "[name].js",
		+     "filename": "bundle.js",
	`)
	);
	test("cache true", { cache: true }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -2,1 +2,7 @@
		-   "cache": false,
		+   "cache": Object {
		+     "immutablePaths": undefined,
		+     "managedPaths": Array [
		+       "<cwd>/node_modules",
		+     ],
		+     "type": "memory",
		+   },
		@@ -43,1 +49,1 @@
		-     "unsafeCache": undefined,
		+     "unsafeCache": [Function anonymous],
		@@ -138,1 +144,1 @@
		-     "cache": false,
		+     "cache": true,
		@@ -157,1 +163,1 @@
		-     "cache": false,
		+     "cache": true,
	`)
	);
	test("cache filesystem", { cache: { type: "filesystem" } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -2,1 +2,20 @@
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
		+     "immutablePaths": undefined,
		+     "managedPaths": Array [
		+       "<cwd>/node_modules",
		+     ],
		+     "name": "default-none",
		+     "store": "pack",
		+     "type": "filesystem",
		+     "version": "",
		+   },
		@@ -43,1 +62,1 @@
		-     "unsafeCache": undefined,
		+     "unsafeCache": [Function anonymous],
		@@ -138,1 +157,1 @@
		-     "cache": false,
		+     "cache": true,
		@@ -157,1 +176,1 @@
		-     "cache": false,
		+     "cache": true,
	`)
	);
});
