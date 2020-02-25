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

		@@ -33,1 +33,1 @@
		-   "mode": "none",
		+   "mode": undefined,
		@@ -68,4 +68,4 @@
		-     "checkWasmTypes": false,
		-     "chunkIds": "natural",
		-     "concatenateModules": false,
		-     "flagIncludedChunks": false,
		+     "checkWasmTypes": true,
		+     "chunkIds": "deterministic",
		+     "concatenateModules": true,
		+     "flagIncludedChunks": true,
		@@ -73,1 +73,1 @@
		-     "mangleExports": false,
		+     "mangleExports": true,
		@@ -76,1 +76,1 @@
		-     "minimize": false,
		+     "minimize": true,
		@@ -82,3 +82,3 @@
		-     "moduleIds": "natural",
		-     "noEmitOnErrors": false,
		-     "nodeEnv": false,
		+     "moduleIds": "deterministic",
		+     "noEmitOnErrors": true,
		+     "nodeEnv": "production",
		@@ -108,3 +108,3 @@
		-       "hidePathInfo": false,
		-       "maxAsyncRequests": Infinity,
		-       "maxInitialRequests": Infinity,
		+       "hidePathInfo": true,
		+       "maxAsyncRequests": 6,
		+       "maxInitialRequests": 4,
		@@ -113,1 +113,1 @@
		-       "minSize": 10000,
		+       "minSize": 30000,
		@@ -154,1 +154,5 @@
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

		@@ -33,1 +33,1 @@
		-   "mode": "none",
		+   "mode": "production",
		@@ -68,4 +68,4 @@
		-     "checkWasmTypes": false,
		-     "chunkIds": "natural",
		-     "concatenateModules": false,
		-     "flagIncludedChunks": false,
		+     "checkWasmTypes": true,
		+     "chunkIds": "deterministic",
		+     "concatenateModules": true,
		+     "flagIncludedChunks": true,
		@@ -73,1 +73,1 @@
		-     "mangleExports": false,
		+     "mangleExports": true,
		@@ -76,1 +76,1 @@
		-     "minimize": false,
		+     "minimize": true,
		@@ -82,3 +82,3 @@
		-     "moduleIds": "natural",
		-     "noEmitOnErrors": false,
		-     "nodeEnv": false,
		+     "moduleIds": "deterministic",
		+     "noEmitOnErrors": true,
		+     "nodeEnv": "production",
		@@ -108,3 +108,3 @@
		-       "hidePathInfo": false,
		-       "maxAsyncRequests": Infinity,
		-       "maxInitialRequests": Infinity,
		+       "hidePathInfo": true,
		+       "maxAsyncRequests": 6,
		+       "maxInitialRequests": 4,
		@@ -113,1 +113,1 @@
		-       "minSize": 10000,
		+       "minSize": 30000,
		@@ -154,1 +154,5 @@
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
		@@ -33,1 +39,1 @@
		-   "mode": "none",
		+   "mode": "development",
		@@ -56,1 +62,1 @@
		-     "unsafeCache": false,
		+     "unsafeCache": [Function anonymous],
		@@ -69,1 +75,1 @@
		-     "chunkIds": "natural",
		+     "chunkIds": "named",
		@@ -82,1 +88,1 @@
		-     "moduleIds": "natural",
		+     "moduleIds": "named",
		@@ -84,1 +90,1 @@
		-     "nodeEnv": false,
		+     "nodeEnv": "development",
		@@ -112,1 +118,1 @@
		-       "minRemainingSize": undefined,
		+       "minRemainingSize": 0,
		@@ -145,1 +151,1 @@
		-     "pathinfo": false,
		+     "pathinfo": true,
		@@ -163,1 +169,1 @@
		-     "cache": false,
		+     "cache": true,
		@@ -182,1 +188,1 @@
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
		@@ -43,0 +43,4 @@
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
		@@ -44,0 +44,5 @@
		+       Object {
		+         "resolve": Object {
		+           "mainFields": Array [
		+             "browser",
		+             "main",
		@@ -45,0 +50,5 @@
		+         },
		+         "test": /\\.mjs$/i,
		+         "type": "javascript/esm",
		+       },
		+     ],
		@@ -165,0 +175,1 @@
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
		@@ -27,1 +27,1 @@
		-   "externalsType": "var",
		+   "externalsType": "module",
		@@ -138,1 +138,1 @@
		-     "iife": true,
		+     "iife": false,
		@@ -140,1 +140,1 @@
		-     "jsonpScriptType": false,
		+     "jsonpScriptType": "module",
		@@ -142,2 +142,2 @@
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
		@@ -43,0 +43,4 @@
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
			@@ -43,0 +43,4 @@
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

		@@ -120,1 +120,1 @@
		-     "chunkFilename": "[name].js",
		+     "chunkFilename": "[id].bundle.js",
		@@ -129,1 +129,1 @@
		-     "filename": "[name].js",
		+     "filename": "bundle.js",
	`)
	);
	test("function filename", { output: { filename: () => "bundle.js" } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -120,1 +120,1 @@
		-     "chunkFilename": "[name].js",
		+     "chunkFilename": "[id].js",
		@@ -129,1 +129,1 @@
		-     "filename": "[name].js",
		+     "filename": [Function filename],
	`)
	);
	test("library", { output: { library: ["myLib", "awesome"] } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -119,1 +119,1 @@
		-     "chunkCallbackName": "webpackChunkwebpack",
		+     "chunkCallbackName": "webpackChunkmyLib_awesome",
		@@ -126,1 +126,1 @@
		-     "devtoolNamespace": "webpack",
		+     "devtoolNamespace": "myLib.awesome",
		@@ -128,1 +128,3 @@
		-     "enabledLibraryTypes": Array [],
		+     "enabledLibraryTypes": Array [
		+       "var",
		+     ],
		@@ -136,1 +138,1 @@
		-     "hotUpdateFunction": "webpackHotUpdatewebpack",
		+     "hotUpdateFunction": "webpackHotUpdatemyLib_awesome",
		@@ -139,1 +141,1 @@
		-     "jsonpFunction": "webpackJsonpwebpack",
		+     "jsonpFunction": "webpackJsonpmyLib_awesome",
		@@ -141,1 +143,10 @@
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
		@@ -150,1 +161,1 @@
		-     "uniqueName": "webpack",
		+     "uniqueName": "myLib.awesome",
	`)
	);
	test("target node", { target: "node" }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -63,3 +63,3 @@
		-     "__dirname": "mock",
		-     "__filename": "mock",
		-     "global": true,
		+     "__dirname": false,
		+     "__filename": false,
		+     "global": false,
		@@ -130,1 +130,1 @@
		-     "globalObject": "window",
		+     "globalObject": "global",
		@@ -160,3 +160,1 @@
		-     "aliasFields": Array [
		-       "browser",
		-     ],
		+     "aliasFields": Array [],
		@@ -170,1 +168,0 @@
		-       "browser",
		@@ -195,1 +192,1 @@
		-   "target": "web",
		+   "target": "node",
	`)
	);
	test("target webworker", { target: "webworker" }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -130,1 +130,1 @@
		-     "globalObject": "window",
		+     "globalObject": "self",
		@@ -195,1 +195,1 @@
		-   "target": "web",
		+   "target": "webworker",
	`)
	);
	test("records", { recordsPath: "some-path" }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -85,1 +85,1 @@
		-     "portableRecords": false,
		+     "portableRecords": true,
		@@ -157,2 +157,2 @@
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

		@@ -127,1 +127,1 @@
		-     "ecmaVersion": 6,
		+     "ecmaVersion": 11,
	`)
	);
	test("single runtimeChunk", { optimization: { runtimeChunk: "single" } }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ -89,1 +89,3 @@
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

			@@ -89,1 +89,3 @@
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

		@@ -89,1 +89,3 @@
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
		@@ -56,1 +62,1 @@
		-     "unsafeCache": false,
		+     "unsafeCache": [Function anonymous],
		@@ -163,1 +169,1 @@
		-     "cache": false,
		+     "cache": true,
		@@ -182,1 +188,1 @@
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
		@@ -56,1 +75,1 @@
		-     "unsafeCache": false,
		+     "unsafeCache": [Function anonymous],
		@@ -163,1 +182,1 @@
		-     "cache": false,
		+     "cache": true,
		@@ -182,1 +201,1 @@
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
			@@ -62,5 +62,1 @@
			-   "node": Object {
			-     "__dirname": "mock",
			-     "__filename": "mock",
			-     "global": true,
			-   },
			+   "node": false,
			@@ -91,24 +87,1 @@
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

			@@ -119,1 +119,1 @@
			-     "chunkCallbackName": "webpackChunkwebpack",
			+     "chunkCallbackName": "webpackChunk_Hello_World_",
			@@ -126,1 +126,1 @@
			-     "devtoolNamespace": "webpack",
			+     "devtoolNamespace": "@@@Hello World!",
			@@ -136,1 +136,1 @@
			-     "hotUpdateFunction": "webpackHotUpdatewebpack",
			+     "hotUpdateFunction": "webpackHotUpdate_Hello_World_",
			@@ -139,1 +139,1 @@
			-     "jsonpFunction": "webpackJsonpwebpack",
			+     "jsonpFunction": "webpackJsonp_Hello_World_",
			@@ -150,1 +150,1 @@
			-     "uniqueName": "webpack",
			+     "uniqueName": "@@@Hello World!",
		`)
	);
});
