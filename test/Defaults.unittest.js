require("./helpers/warmup-webpack");

const path = require("path");
const jestDiff = require("jest-diff").diff;
const stripAnsi = require("strip-ansi");

/**
 * Escapes regular expression metacharacters
 * @param {string} str String to quote
 * @returns {string} Escaped string
 */
const quoteMeta = str => str.replace(/[-[\]\\/{}()*+?.^$|]/g, "\\$&");

const cwd = process.cwd();
const cwdRegExp = new RegExp(
	`${quoteMeta(cwd)}((?:\\\\)?(?:[a-zA-Z.\\-_]+\\\\)*)`,
	"g"
);
const escapedCwd = JSON.stringify(cwd).slice(1, -1);
const escapedCwdRegExp = new RegExp(
	`${quoteMeta(escapedCwd)}((?:\\\\\\\\)?(?:[a-zA-Z.\\-_]+\\\\\\\\)*)`,
	"g"
);
const normalize = str => {
	if (cwd.startsWith("/")) {
		str = str.replace(new RegExp(quoteMeta(cwd), "g"), "<cwd>");
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
	const { applyWebpackOptionsDefaults, getNormalizedWebpackOptions } =
		require("..").config;
	config = getNormalizedWebpackOptions(config);
	applyWebpackOptionsDefaults(config);
	process.chdir(cwd);
	return config;
};

describe("snapshots", () => {
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
		    "asyncWebAssembly": false,
		    "backCompat": true,
		    "buildHttp": undefined,
		    "cacheUnaffected": false,
		    "css": undefined,
		    "futureDefaults": false,
		    "layers": false,
		    "lazyCompilation": undefined,
		    "outputModule": false,
		    "syncWebAssembly": false,
		    "topLevelAwait": true,
		  },
		  "externals": undefined,
		  "externalsPresets": Object {
		    "electron": false,
		    "electronMain": false,
		    "electronPreload": false,
		    "electronRenderer": false,
		    "node": false,
		    "nwjs": false,
		    "web": true,
		  },
		  "externalsType": "var",
		  "ignoreWarnings": undefined,
		  "infrastructureLogging": Object {},
		  "loader": Object {
		    "environment": Object {
		      "arrowFunction": true,
		      "asyncFunction": true,
		      "bigIntLiteral": true,
		      "const": true,
		      "destructuring": true,
		      "document": true,
		      "dynamicImport": undefined,
		      "dynamicImportInWorker": undefined,
		      "forOf": true,
		      "globalThis": undefined,
		      "module": undefined,
		      "nodePrefixForCoreModules": true,
		      "optionalChaining": true,
		      "templateLiteral": true,
		    },
		    "target": "web",
		  },
		  "mode": "none",
		  "module": Object {
		    "defaultRules": Array [
		      Object {
		        "mimetype": "application/node",
		        "type": "javascript/auto",
		      },
		      Object {
		        "test": /\\\\\\.json\\$/i,
		        "type": "json",
		      },
		      Object {
		        "mimetype": "application/json",
		        "type": "json",
		      },
		      Object {
		        "resolve": Object {
		          "byDependency": Object {
		            "esm": Object {
		              "fullySpecified": true,
		            },
		          },
		        },
		        "test": /\\\\\\.mjs\\$/i,
		        "type": "javascript/esm",
		      },
		      Object {
		        "descriptionData": Object {
		          "type": "module",
		        },
		        "resolve": Object {
		          "byDependency": Object {
		            "esm": Object {
		              "fullySpecified": true,
		            },
		          },
		        },
		        "test": /\\\\\\.js\\$/i,
		        "type": "javascript/esm",
		      },
		      Object {
		        "test": /\\\\\\.cjs\\$/i,
		        "type": "javascript/dynamic",
		      },
		      Object {
		        "descriptionData": Object {
		          "type": "commonjs",
		        },
		        "test": /\\\\\\.js\\$/i,
		        "type": "javascript/dynamic",
		      },
		      Object {
		        "mimetype": Object {
		          "or": Array [
		            "text/javascript",
		            "application/javascript",
		          ],
		        },
		        "resolve": Object {
		          "byDependency": Object {
		            "esm": Object {
		              "fullySpecified": true,
		            },
		          },
		        },
		        "type": "javascript/esm",
		      },
		      Object {
		        "dependency": "url",
		        "oneOf": Array [
		          Object {
		            "scheme": /\\^data\\$/,
		            "type": "asset/inline",
		          },
		          Object {
		            "type": "asset/resource",
		          },
		        ],
		      },
		      Object {
		        "assert": Object {
		          "type": "json",
		        },
		        "type": "json",
		      },
		      Object {
		        "type": "json",
		        "with": Object {
		          "type": "json",
		        },
		      },
		    ],
		    "generator": Object {},
		    "noParse": undefined,
		    "parser": Object {
		      "asset": Object {
		        "dataUrlCondition": Object {
		          "maxSize": 8096,
		        },
		      },
		      "javascript": Object {
		        "createRequire": false,
		        "dynamicImportFetchPriority": false,
		        "dynamicImportMode": "lazy",
		        "dynamicImportPrefetch": false,
		        "dynamicImportPreload": false,
		        "exprContextCritical": true,
		        "exprContextRecursive": true,
		        "exprContextRegExp": false,
		        "exprContextRequest": ".",
		        "importMeta": true,
		        "strictExportPresence": undefined,
		        "strictThisContextOnImports": false,
		        "unknownContextCritical": true,
		        "unknownContextRecursive": true,
		        "unknownContextRegExp": false,
		        "unknownContextRequest": ".",
		        "wrappedContextCritical": false,
		        "wrappedContextRecursive": true,
		        "wrappedContextRegExp": /\\.\\*/,
		      },
		    },
		    "rules": Array [],
		    "unsafeCache": false,
		  },
		  "name": undefined,
		  "node": Object {
		    "__dirname": "mock",
		    "__filename": "mock",
		    "global": true,
		  },
		  "optimization": Object {
		    "avoidEntryIife": false,
		    "checkWasmTypes": false,
		    "chunkIds": "natural",
		    "concatenateModules": false,
		    "emitOnErrors": true,
		    "flagIncludedChunks": false,
		    "innerGraph": false,
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
		    "nodeEnv": false,
		    "portableRecords": false,
		    "providedExports": true,
		    "realContentHash": false,
		    "removeAvailableModules": false,
		    "removeEmptyChunks": true,
		    "runtimeChunk": false,
		    "sideEffects": "flag",
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
		      "defaultSizeTypes": Array [
		        "javascript",
		        "unknown",
		      ],
		      "enforceSizeThreshold": 30000,
		      "hidePathInfo": false,
		      "maxAsyncRequests": Infinity,
		      "maxInitialRequests": Infinity,
		      "minChunks": 1,
		      "minRemainingSize": undefined,
		      "minSize": 10000,
		      "usedExports": false,
		    },
		    "usedExports": false,
		  },
		  "output": Object {
		    "assetModuleFilename": "[hash][ext][query]",
		    "asyncChunks": true,
		    "charset": true,
		    "chunkFilename": "[name].js",
		    "chunkFormat": "array-push",
		    "chunkLoadTimeout": 120000,
		    "chunkLoading": "jsonp",
		    "chunkLoadingGlobal": "webpackChunkwebpack",
		    "clean": undefined,
		    "compareBeforeEmit": true,
		    "crossOriginLoading": false,
		    "cssChunkFilename": "[name].css",
		    "cssFilename": "[name].css",
		    "cssHeadDataCompression": true,
		    "devtoolFallbackModuleFilenameTemplate": undefined,
		    "devtoolModuleFilenameTemplate": undefined,
		    "devtoolNamespace": "webpack",
		    "enabledChunkLoadingTypes": Array [
		      "jsonp",
		      "import-scripts",
		    ],
		    "enabledLibraryTypes": Array [],
		    "enabledWasmLoadingTypes": Array [
		      "fetch",
		    ],
		    "environment": Object {
		      "arrowFunction": true,
		      "asyncFunction": true,
		      "bigIntLiteral": true,
		      "const": true,
		      "destructuring": true,
		      "document": true,
		      "dynamicImport": undefined,
		      "dynamicImportInWorker": undefined,
		      "forOf": true,
		      "globalThis": undefined,
		      "module": undefined,
		      "nodePrefixForCoreModules": true,
		      "optionalChaining": true,
		      "templateLiteral": true,
		    },
		    "filename": "[name].js",
		    "globalObject": "self",
		    "hashDigest": "hex",
		    "hashDigestLength": 20,
		    "hashFunction": "md4",
		    "hashSalt": undefined,
		    "hotUpdateChunkFilename": "[id].[fullhash].hot-update.js",
		    "hotUpdateGlobal": "webpackHotUpdatewebpack",
		    "hotUpdateMainFilename": "[runtime].[fullhash].hot-update.json",
		    "ignoreBrowserWarnings": undefined,
		    "iife": true,
		    "importFunctionName": "import",
		    "importMetaName": "import.meta",
		    "library": undefined,
		    "module": false,
		    "path": "<cwd>/dist",
		    "pathinfo": false,
		    "publicPath": "auto",
		    "scriptType": false,
		    "sourceMapFilename": "[file].map[query]",
		    "sourcePrefix": undefined,
		    "strictModuleErrorHandling": false,
		    "strictModuleExceptionHandling": false,
		    "trustedTypes": undefined,
		    "uniqueName": "webpack",
		    "wasmLoading": "fetch",
		    "webassemblyModuleFilename": "[hash].module.wasm",
		    "workerChunkLoading": "import-scripts",
		    "workerPublicPath": "",
		    "workerWasmLoading": "fetch",
		  },
		  "parallelism": 100,
		  "performance": false,
		  "plugins": Array [],
		  "profile": false,
		  "recordsInputPath": false,
		  "recordsOutputPath": false,
		  "resolve": Object {
		    "aliasFields": Array [],
		    "byDependency": Object {
		      "amd": Object {
		        "aliasFields": Array [
		          "browser",
		        ],
		        "conditionNames": Array [
		          "require",
		          "module",
		          "...",
		        ],
		        "extensions": Array [
		          ".js",
		          ".json",
		          ".wasm",
		        ],
		        "mainFields": Array [
		          "browser",
		          "module",
		          "...",
		        ],
		      },
		      "commonjs": Object {
		        "aliasFields": Array [
		          "browser",
		        ],
		        "conditionNames": Array [
		          "require",
		          "module",
		          "...",
		        ],
		        "extensions": Array [
		          ".js",
		          ".json",
		          ".wasm",
		        ],
		        "mainFields": Array [
		          "browser",
		          "module",
		          "...",
		        ],
		      },
		      "esm": Object {
		        "aliasFields": Array [
		          "browser",
		        ],
		        "conditionNames": Array [
		          "import",
		          "module",
		          "...",
		        ],
		        "extensions": Array [
		          ".js",
		          ".json",
		          ".wasm",
		        ],
		        "mainFields": Array [
		          "browser",
		          "module",
		          "...",
		        ],
		      },
		      "loader": Object {
		        "aliasFields": Array [
		          "browser",
		        ],
		        "conditionNames": Array [
		          "require",
		          "module",
		          "...",
		        ],
		        "extensions": Array [
		          ".js",
		          ".json",
		          ".wasm",
		        ],
		        "mainFields": Array [
		          "browser",
		          "module",
		          "...",
		        ],
		      },
		      "loaderImport": Object {
		        "aliasFields": Array [
		          "browser",
		        ],
		        "conditionNames": Array [
		          "import",
		          "module",
		          "...",
		        ],
		        "extensions": Array [
		          ".js",
		          ".json",
		          ".wasm",
		        ],
		        "mainFields": Array [
		          "browser",
		          "module",
		          "...",
		        ],
		      },
		      "undefined": Object {
		        "aliasFields": Array [
		          "browser",
		        ],
		        "conditionNames": Array [
		          "require",
		          "module",
		          "...",
		        ],
		        "extensions": Array [
		          ".js",
		          ".json",
		          ".wasm",
		        ],
		        "mainFields": Array [
		          "browser",
		          "module",
		          "...",
		        ],
		      },
		      "unknown": Object {
		        "aliasFields": Array [
		          "browser",
		        ],
		        "conditionNames": Array [
		          "require",
		          "module",
		          "...",
		        ],
		        "extensions": Array [
		          ".js",
		          ".json",
		          ".wasm",
		        ],
		        "mainFields": Array [
		          "browser",
		          "module",
		          "...",
		        ],
		      },
		      "url": Object {
		        "preferRelative": true,
		      },
		      "wasm": Object {
		        "aliasFields": Array [
		          "browser",
		        ],
		        "conditionNames": Array [
		          "import",
		          "module",
		          "...",
		        ],
		        "extensions": Array [
		          ".js",
		          ".json",
		          ".wasm",
		        ],
		        "mainFields": Array [
		          "browser",
		          "module",
		          "...",
		        ],
		      },
		      "worker": Object {
		        "aliasFields": Array [
		          "browser",
		        ],
		        "conditionNames": Array [
		          "import",
		          "module",
		          "...",
		        ],
		        "extensions": Array [
		          ".js",
		          ".json",
		          ".wasm",
		        ],
		        "mainFields": Array [
		          "browser",
		          "module",
		          "...",
		        ],
		        "preferRelative": true,
		      },
		    },
		    "cache": false,
		    "conditionNames": Array [
		      "webpack",
		      "production",
		      "browser",
		    ],
		    "exportsFields": Array [
		      "exports",
		    ],
		    "extensions": Array [],
		    "importsFields": Array [
		      "imports",
		    ],
		    "mainFields": Array [
		      "main",
		    ],
		    "mainFiles": Array [
		      "index",
		    ],
		    "modules": Array [
		      "node_modules",
		    ],
		    "roots": Array [
		      "<cwd>",
		    ],
		  },
		  "resolveLoader": Object {
		    "cache": false,
		    "conditionNames": Array [
		      "loader",
		      "require",
		      "node",
		    ],
		    "exportsFields": Array [
		      "exports",
		    ],
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
		  "snapshot": Object {
		    "buildDependencies": Object {
		      "hash": true,
		      "timestamp": true,
		    },
		    "immutablePaths": Array [],
		    "managedPaths": Array [
		      "<cwd>/node_modules/",
		    ],
		    "module": Object {
		      "timestamp": true,
		    },
		    "resolve": Object {
		      "timestamp": true,
		    },
		    "resolveBuildDependencies": Object {
		      "hash": true,
		      "timestamp": true,
		    },
		    "unmanagedPaths": Array [],
		  },
		  "stats": Object {},
		  "target": "web",
		  "watch": false,
		  "watchOptions": Object {},
		}
	`);
	});

	const test = (name, options, fn, before, after) => {
		it(`should generate the correct defaults from ${name}`, () => {
			if (!("mode" in options)) options.mode = "none";
			try {
				if (before) before();
				const result = getDefaultConfig(options);

				const diff = stripAnsi(
					jestDiff(baseConfig, result, { expand: false, contextLines: 0 })
				);

				fn(expect(new Diff(diff)), expect(result));
			} finally {
				if (after) after();
			}
		});
	};

	test("empty config", {}, e =>
		e.toMatchInlineSnapshot("Compared values have no visual difference.")
	);
	test("none mode", { mode: "none" }, e =>
		e.toMatchInlineSnapshot("Compared values have no visual difference.")
	);
	test("no mode provided", { mode: undefined }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-   "mode": "none",
		+   "mode": undefined,
		@@ ... @@
		-     "avoidEntryIife": false,
		-     "checkWasmTypes": false,
		-     "chunkIds": "natural",
		-     "concatenateModules": false,
		-     "emitOnErrors": true,
		-     "flagIncludedChunks": false,
		-     "innerGraph": false,
		-     "mangleExports": false,
		+     "avoidEntryIife": true,
		+     "checkWasmTypes": true,
		+     "chunkIds": "deterministic",
		+     "concatenateModules": true,
		+     "emitOnErrors": false,
		+     "flagIncludedChunks": true,
		+     "innerGraph": true,
		+     "mangleExports": true,
		@@ ... @@
		-     "minimize": false,
		+     "minimize": true,
		@@ ... @@
		-     "moduleIds": "natural",
		-     "nodeEnv": false,
		+     "moduleIds": "deterministic",
		+     "nodeEnv": "production",
		@@ ... @@
		-     "realContentHash": false,
		+     "realContentHash": true,
		@@ ... @@
		-     "sideEffects": "flag",
		+     "sideEffects": true,
		@@ ... @@
		-       "enforceSizeThreshold": 30000,
		-       "hidePathInfo": false,
		-       "maxAsyncRequests": Infinity,
		-       "maxInitialRequests": Infinity,
		+       "enforceSizeThreshold": 50000,
		+       "hidePathInfo": true,
		+       "maxAsyncRequests": 30,
		+       "maxInitialRequests": 30,
		@@ ... @@
		-       "minSize": 10000,
		-       "usedExports": false,
		+       "minSize": 20000,
		+       "usedExports": true,
		@@ ... @@
		-     "usedExports": false,
		+     "usedExports": true,
		@@ ... @@
		-   "performance": false,
		+   "performance": Object {
		+     "hints": "warning",
		+     "maxAssetSize": 250000,
		+     "maxEntrypointSize": 250000,
		+   },
		@@ ... @@
		+       "hash": true,
		@@ ... @@
		+       "hash": true,
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
		-     "avoidEntryIife": false,
		-     "checkWasmTypes": false,
		-     "chunkIds": "natural",
		-     "concatenateModules": false,
		-     "emitOnErrors": true,
		-     "flagIncludedChunks": false,
		-     "innerGraph": false,
		-     "mangleExports": false,
		+     "avoidEntryIife": true,
		+     "checkWasmTypes": true,
		+     "chunkIds": "deterministic",
		+     "concatenateModules": true,
		+     "emitOnErrors": false,
		+     "flagIncludedChunks": true,
		+     "innerGraph": true,
		+     "mangleExports": true,
		@@ ... @@
		-     "minimize": false,
		+     "minimize": true,
		@@ ... @@
		-     "moduleIds": "natural",
		-     "nodeEnv": false,
		+     "moduleIds": "deterministic",
		+     "nodeEnv": "production",
		@@ ... @@
		-     "realContentHash": false,
		+     "realContentHash": true,
		@@ ... @@
		-     "sideEffects": "flag",
		+     "sideEffects": true,
		@@ ... @@
		-       "enforceSizeThreshold": 30000,
		-       "hidePathInfo": false,
		-       "maxAsyncRequests": Infinity,
		-       "maxInitialRequests": Infinity,
		+       "enforceSizeThreshold": 50000,
		+       "hidePathInfo": true,
		+       "maxAsyncRequests": 30,
		+       "maxInitialRequests": 30,
		@@ ... @@
		-       "minSize": 10000,
		-       "usedExports": false,
		+       "minSize": 20000,
		+       "usedExports": true,
		@@ ... @@
		-     "usedExports": false,
		+     "usedExports": true,
		@@ ... @@
		-   "performance": false,
		+   "performance": Object {
		+     "hints": "warning",
		+     "maxAssetSize": 250000,
		+     "maxEntrypointSize": 250000,
		+   },
		@@ ... @@
		+       "hash": true,
		@@ ... @@
		+       "hash": true,
	`)
	);
	test("development", { mode: "development" }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-   "cache": false,
		+   "cache": Object {
		+     "cacheUnaffected": false,
		+     "maxGenerations": Infinity,
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
		-     "nodeEnv": false,
		+     "moduleIds": "named",
		+     "nodeEnv": "development",
		@@ ... @@
		-       "minRemainingSize": undefined,
		+       "minRemainingSize": 0,
		@@ ... @@
		-     "cssHeadDataCompression": true,
		+     "cssHeadDataCompression": false,
		@@ ... @@
		-     "pathinfo": false,
		+     "pathinfo": true,
		@@ ... @@
		-     "cache": false,
		+     "cache": true,
		@@ ... @@
		-       "production",
		+       "development",
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
		+         "rules": Array [
		+           Object {
		+             "descriptionData": Object {
		+               "type": "module",
		+             },
		+             "resolve": Object {
		+               "fullySpecified": true,
		+             },
		+           },
		+         ],
		+         "test": /\\.wasm$/i,
		+         "type": "webassembly/sync",
		+       },
		+       Object {
		+         "mimetype": "application/wasm",
		+         "rules": Array [
		+           Object {
		+             "descriptionData": Object {
		+               "type": "module",
		+             },
		+             "resolve": Object {
		+               "fullySpecified": true,
		+             },
		+           },
		+         ],
		+         "type": "webassembly/sync",
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
		+   "externalsType": "module-import",
		@@ ... @@
		-       "dynamicImport": undefined,
		-       "dynamicImportInWorker": undefined,
		+       "dynamicImport": true,
		+       "dynamicImportInWorker": true,
		@@ ... @@
		-       "module": undefined,
		+       "module": true,
		@@ ... @@
		-     "chunkFilename": "[name].js",
		-     "chunkFormat": "array-push",
		+     "chunkFilename": "[name].mjs",
		+     "chunkFormat": "module",
		@@ ... @@
		-     "chunkLoading": "jsonp",
		+     "chunkLoading": "import",
		@@ ... @@
		-       "jsonp",
		-       "import-scripts",
		+       "import",
		@@ ... @@
		-       "dynamicImport": undefined,
		-       "dynamicImportInWorker": undefined,
		+       "dynamicImport": true,
		+       "dynamicImportInWorker": true,
		@@ ... @@
		-       "module": undefined,
		+       "module": true,
		@@ ... @@
		-     "filename": "[name].js",
		+     "filename": "[name].mjs",
		@@ ... @@
		-     "hotUpdateChunkFilename": "[id].[fullhash].hot-update.js",
		+     "hotUpdateChunkFilename": "[id].[fullhash].hot-update.mjs",
		@@ ... @@
		-     "iife": true,
		+     "iife": false,
		@@ ... @@
		-     "module": false,
		+     "module": true,
		@@ ... @@
		-     "scriptType": false,
		+     "scriptType": "module",
		@@ ... @@
		-     "workerChunkLoading": "import-scripts",
		+     "workerChunkLoading": "import",
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
		+         "rules": Array [
		+           Object {
		+             "descriptionData": Object {
		+               "type": "module",
		+             },
		+             "resolve": Object {
		+               "fullySpecified": true,
		+             },
		+           },
		+         ],
		+         "test": /\\.wasm$/i,
		+         "type": "webassembly/async",
		+       },
		+       Object {
		+         "mimetype": "application/wasm",
		+         "rules": Array [
		+           Object {
		+             "descriptionData": Object {
		+               "type": "module",
		+             },
		+             "resolve": Object {
		+               "fullySpecified": true,
		+             },
		+           },
		+         ],
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
			+         "rules": Array [
			+           Object {
			+             "descriptionData": Object {
			+               "type": "module",
			+             },
			+             "resolve": Object {
			+               "fullySpecified": true,
			+             },
			+           },
			+         ],
			+         "test": /\\.wasm$/i,
			+         "type": "webassembly/async",
			+       },
			+       Object {
			+         "mimetype": "application/wasm",
			+         "rules": Array [
			+           Object {
			+             "descriptionData": Object {
			+               "type": "module",
			+             },
			+             "resolve": Object {
			+               "fullySpecified": true,
			+             },
			+           },
			+         ],
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
		-     "cssChunkFilename": "[name].css",
		-     "cssFilename": "[name].css",
		+     "cssChunkFilename": "[id].bundle.css",
		+     "cssFilename": "bundle.css",
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
		-     "cssChunkFilename": "[name].css",
		-     "cssFilename": "[name].css",
		+     "cssChunkFilename": "[id].css",
		+     "cssFilename": "[id].css",
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
		-     "chunkLoadingGlobal": "webpackChunkwebpack",
		+     "chunkLoadingGlobal": "webpackChunkmyLib_awesome",
		@@ ... @@
		-     "devtoolNamespace": "webpack",
		+     "devtoolNamespace": "myLib.awesome",
		@@ ... @@
		-     "enabledLibraryTypes": Array [],
		+     "enabledLibraryTypes": Array [
		+       "var",
		+     ],
		@@ ... @@
		-     "hotUpdateGlobal": "webpackHotUpdatewebpack",
		+     "hotUpdateGlobal": "webpackHotUpdatemyLib_awesome",
		@@ ... @@
		-     "library": undefined,
		+     "library": Object {
		+       "amdContainer": undefined,
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
	test(
		"library contains [name] placeholder",
		{
			output: {
				library: ["myLib", "[name]"]
			}
		},
		e =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-     "chunkLoadingGlobal": "webpackChunkwebpack",
			+     "chunkLoadingGlobal": "webpackChunkmyLib",
			@@ ... @@
			-     "devtoolNamespace": "webpack",
			+     "devtoolNamespace": "myLib",
			@@ ... @@
			-     "enabledLibraryTypes": Array [],
			+     "enabledLibraryTypes": Array [
			+       "var",
			+     ],
			@@ ... @@
			-     "hotUpdateGlobal": "webpackHotUpdatewebpack",
			+     "hotUpdateGlobal": "webpackHotUpdatemyLib",
			@@ ... @@
			-     "library": undefined,
			+     "library": Object {
			+       "amdContainer": undefined,
			+       "auxiliaryComment": undefined,
			+       "export": undefined,
			+       "name": Array [
			+         "myLib",
			+         "[name]",
			+       ],
			+       "type": "var",
			+       "umdNamedDefine": undefined,
			+     },
			@@ ... @@
			-     "uniqueName": "webpack",
			+     "uniqueName": "myLib",
		`)
	);
	test(
		"library.name contains [name] placeholder",
		{
			output: {
				library: {
					name: ["my[name]Lib", "[name]", "lib"],
					type: "var"
				}
			}
		},
		e =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-     "chunkLoadingGlobal": "webpackChunkwebpack",
			+     "chunkLoadingGlobal": "webpackChunkmyLib_lib",
			@@ ... @@
			-     "devtoolNamespace": "webpack",
			+     "devtoolNamespace": "myLib.lib",
			@@ ... @@
			-     "enabledLibraryTypes": Array [],
			+     "enabledLibraryTypes": Array [
			+       "var",
			+     ],
			@@ ... @@
			-     "hotUpdateGlobal": "webpackHotUpdatewebpack",
			+     "hotUpdateGlobal": "webpackHotUpdatemyLib_lib",
			@@ ... @@
			-     "library": undefined,
			+     "library": Object {
			+       "amdContainer": undefined,
			+       "auxiliaryComment": undefined,
			+       "export": undefined,
			+       "name": Array [
			+         "my[name]Lib",
			+         "[name]",
			+         "lib",
			+       ],
			+       "type": "var",
			+       "umdNamedDefine": undefined,
			+     },
			@@ ... @@
			-     "uniqueName": "webpack",
			+     "uniqueName": "myLib.lib",
		`)
	);
	test(
		"library.name.root contains [name] placeholder",
		{
			output: {
				library: {
					name: {
						root: ["[name]", "myLib"]
					},
					type: "var"
				}
			}
		},
		e =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-     "chunkLoadingGlobal": "webpackChunkwebpack",
			+     "chunkLoadingGlobal": "webpackChunkmyLib",
			@@ ... @@
			-     "devtoolNamespace": "webpack",
			+     "devtoolNamespace": "myLib",
			@@ ... @@
			-     "enabledLibraryTypes": Array [],
			+     "enabledLibraryTypes": Array [
			+       "var",
			+     ],
			@@ ... @@
			-     "hotUpdateGlobal": "webpackHotUpdatewebpack",
			+     "hotUpdateGlobal": "webpackHotUpdatemyLib",
			@@ ... @@
			-     "library": undefined,
			+     "library": Object {
			+       "amdContainer": undefined,
			+       "auxiliaryComment": undefined,
			+       "export": undefined,
			+       "name": Object {
			+         "root": Array [
			+           "[name]",
			+           "myLib",
			+         ],
			+       },
			+       "type": "var",
			+       "umdNamedDefine": undefined,
			+     },
			@@ ... @@
			-     "uniqueName": "webpack",
			+     "uniqueName": "myLib",
		`)
	);
	test(
		"library.name.root contains escaped placeholder",
		{
			output: {
				library: {
					name: {
						root: ["[\\name\\]", "my[\\name\\]Lib[name]", "[\\name\\]"]
					},
					type: "var"
				}
			}
		},
		e =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-     "chunkLoadingGlobal": "webpackChunkwebpack",
			+     "chunkLoadingGlobal": "webpackChunk_name_my_name_Lib_name_",
			@@ ... @@
			-     "devtoolNamespace": "webpack",
			+     "devtoolNamespace": "[name].my[name]Lib.[name]",
			@@ ... @@
			-     "enabledLibraryTypes": Array [],
			+     "enabledLibraryTypes": Array [
			+       "var",
			+     ],
			@@ ... @@
			-     "hotUpdateGlobal": "webpackHotUpdatewebpack",
			+     "hotUpdateGlobal": "webpackHotUpdate_name_my_name_Lib_name_",
			@@ ... @@
			-     "library": undefined,
			+     "library": Object {
			+       "amdContainer": undefined,
			+       "auxiliaryComment": undefined,
			+       "export": undefined,
			+       "name": Object {
			+         "root": Array [
			+           "[\\\\name\\\\]",
			+           "my[\\\\name\\\\]Lib[name]",
			+           "[\\\\name\\\\]",
			+         ],
			+       },
			+       "type": "var",
			+       "umdNamedDefine": undefined,
			+     },
			@@ ... @@
			-     "uniqueName": "webpack",
			+     "uniqueName": "[name].my[name]Lib.[name]",
		`)
	);
	test("target node", { target: "node" }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "node": false,
		+     "node": true,
		@@ ... @@
		-     "web": true,
		+     "web": false,
		@@ ... @@
		-       "document": true,
		+       "document": false,
		@@ ... @@
		-     "target": "web",
		+     "target": "node",
		@@ ... @@
		-         "createRequire": false,
		+         "createRequire": true,
		@@ ... @@
		-     "__dirname": "mock",
		-     "__filename": "mock",
		-     "global": true,
		+     "__dirname": "eval-only",
		+     "__filename": "eval-only",
		+     "global": false,
		@@ ... @@
		-     "chunkFormat": "array-push",
		+     "chunkFormat": "commonjs",
		@@ ... @@
		-     "chunkLoading": "jsonp",
		+     "chunkLoading": "require",
		@@ ... @@
		-       "jsonp",
		-       "import-scripts",
		+       "require",
		@@ ... @@
		-       "fetch",
		+       "async-node",
		@@ ... @@
		-       "document": true,
		+       "document": false,
		@@ ... @@
		-     "globalObject": "self",
		+     "globalObject": "global",
		@@ ... @@
		-     "publicPath": "auto",
		+     "publicPath": "",
		@@ ... @@
		-     "wasmLoading": "fetch",
		+     "wasmLoading": "async-node",
		@@ ... @@
		-     "workerChunkLoading": "import-scripts",
		+     "workerChunkLoading": "require",
		@@ ... @@
		-     "workerWasmLoading": "fetch",
		+     "workerWasmLoading": "async-node",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-       "browser",
		+       "node",
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
		-       "document": true,
		+       "document": false,
		@@ ... @@
		-     "chunkLoading": "jsonp",
		+     "chunkLoading": "import-scripts",
		@@ ... @@
		-       "jsonp",
		@@ ... @@
		-       "document": true,
		+       "document": false,
		@@ ... @@
		+       "worker",
		@@ ... @@
		-   "target": "web",
		+   "target": "webworker",
	`)
	);
	test("target electron-main", { target: "electron-main" }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "electron": false,
		-     "electronMain": false,
		+     "electron": true,
		+     "electronMain": true,
		@@ ... @@
		-     "node": false,
		+     "node": true,
		@@ ... @@
		-     "web": true,
		+     "web": false,
		@@ ... @@
		-       "document": true,
		+       "document": false,
		@@ ... @@
		-     "target": "web",
		+     "target": "electron-main",
		@@ ... @@
		-         "createRequire": false,
		+         "createRequire": true,
		@@ ... @@
		-     "__dirname": "mock",
		-     "__filename": "mock",
		-     "global": true,
		+     "__dirname": "eval-only",
		+     "__filename": "eval-only",
		+     "global": false,
		@@ ... @@
		-     "chunkFormat": "array-push",
		+     "chunkFormat": "commonjs",
		@@ ... @@
		-     "chunkLoading": "jsonp",
		+     "chunkLoading": "require",
		@@ ... @@
		-       "jsonp",
		-       "import-scripts",
		+       "require",
		@@ ... @@
		-       "fetch",
		+       "async-node",
		@@ ... @@
		-       "document": true,
		+       "document": false,
		@@ ... @@
		-     "globalObject": "self",
		+     "globalObject": "global",
		@@ ... @@
		-     "publicPath": "auto",
		+     "publicPath": "",
		@@ ... @@
		-     "wasmLoading": "fetch",
		+     "wasmLoading": "async-node",
		@@ ... @@
		-     "workerChunkLoading": "import-scripts",
		+     "workerChunkLoading": "require",
		@@ ... @@
		-     "workerWasmLoading": "fetch",
		+     "workerWasmLoading": "async-node",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-       "browser",
		+       "node",
		+       "electron",
		@@ ... @@
		-   "target": "web",
		+   "target": "electron-main",
	`)
	);
	test("target electron-main", { target: "electron-preload" }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "electron": false,
		+     "electron": true,
		@@ ... @@
		-     "electronPreload": false,
		+     "electronPreload": true,
		@@ ... @@
		-     "node": false,
		+     "node": true,
		@@ ... @@
		-       "document": true,
		+       "document": false,
		@@ ... @@
		-     "target": "web",
		+     "target": "electron-preload",
		@@ ... @@
		-         "createRequire": false,
		+         "createRequire": true,
		@@ ... @@
		-     "__dirname": "mock",
		-     "__filename": "mock",
		-     "global": true,
		+     "__dirname": "eval-only",
		+     "__filename": "eval-only",
		+     "global": false,
		@@ ... @@
		-     "chunkFormat": "array-push",
		+     "chunkFormat": "commonjs",
		@@ ... @@
		-     "chunkLoading": "jsonp",
		+     "chunkLoading": "require",
		@@ ... @@
		-       "jsonp",
		-       "import-scripts",
		+       "require",
		@@ ... @@
		-       "fetch",
		+       "async-node",
		@@ ... @@
		-       "document": true,
		+       "document": false,
		@@ ... @@
		-     "globalObject": "self",
		+     "globalObject": "global",
		@@ ... @@
		-     "publicPath": "auto",
		+     "publicPath": "",
		@@ ... @@
		-     "wasmLoading": "fetch",
		+     "wasmLoading": "async-node",
		@@ ... @@
		-     "workerChunkLoading": "import-scripts",
		+     "workerChunkLoading": "require",
		@@ ... @@
		-     "workerWasmLoading": "fetch",
		+     "workerWasmLoading": "async-node",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		-         "aliasFields": Array [
		-           "browser",
		-         ],
		+         "aliasFields": Array [],
		@@ ... @@
		-           "browser",
		@@ ... @@
		+       "node",
		@@ ... @@
		+       "electron",
		@@ ... @@
		-   "target": "web",
		+   "target": "electron-preload",
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
	test("ecmaVersion", { output: { ecmaVersion: 2020 } }, e =>
		e.toMatchInlineSnapshot("Compared values have no visual difference.")
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
		+     "cacheUnaffected": false,
		+     "maxGenerations": Infinity,
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
		+     "allowCollectingMemory": false,
		+     "buildDependencies": Object {
		+       "defaultWebpack": Array [
		+         "<cwd>/lib/",
		+       ],
		+     },
		+     "cacheDirectory": "<cwd>/node_modules/.cache/webpack",
		+     "cacheLocation": "<cwd>/node_modules/.cache/webpack/default-none",
		+     "compression": false,
		+     "hashAlgorithm": "md4",
		+     "idleTimeout": 60000,
		+     "idleTimeoutAfterLargeChanges": 1000,
		+     "idleTimeoutForInitialStore": 5000,
		+     "maxAge": 5184000000,
		+     "maxMemoryGenerations": Infinity,
		+     "memoryCacheUnaffected": false,
		+     "name": "default-none",
		+     "profile": false,
		+     "readonly": false,
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
		"cache filesystem development",
		{ mode: "development", cache: { type: "filesystem" } },
		e =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-   "cache": false,
			+   "cache": Object {
			+     "allowCollectingMemory": true,
			+     "buildDependencies": Object {
			+       "defaultWebpack": Array [
			+         "<cwd>/lib/",
			+       ],
			+     },
			+     "cacheDirectory": "<cwd>/node_modules/.cache/webpack",
			+     "cacheLocation": "<cwd>/node_modules/.cache/webpack/default-development",
			+     "compression": false,
			+     "hashAlgorithm": "md4",
			+     "idleTimeout": 60000,
			+     "idleTimeoutAfterLargeChanges": 1000,
			+     "idleTimeoutForInitialStore": 5000,
			+     "maxAge": 5184000000,
			+     "maxMemoryGenerations": 5,
			+     "memoryCacheUnaffected": false,
			+     "name": "default-development",
			+     "profile": false,
			+     "readonly": false,
			+     "store": "pack",
			+     "type": "filesystem",
			+     "version": "",
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
			-     "nodeEnv": false,
			+     "moduleIds": "named",
			+     "nodeEnv": "development",
			@@ ... @@
			-       "minRemainingSize": undefined,
			+       "minRemainingSize": 0,
			@@ ... @@
			-     "cssHeadDataCompression": true,
			+     "cssHeadDataCompression": false,
			@@ ... @@
			-     "pathinfo": false,
			+     "pathinfo": true,
			@@ ... @@
			-     "cache": false,
			+     "cache": true,
			@@ ... @@
			-       "production",
			+       "development",
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
			-       "defaultSizeTypes": Array [
			-         "javascript",
			-         "unknown",
			-       ],
			-       "enforceSizeThreshold": 30000,
			-       "hidePathInfo": false,
			-       "maxAsyncRequests": Infinity,
			-       "maxInitialRequests": Infinity,
			-       "minChunks": 1,
			-       "minRemainingSize": undefined,
			-       "minSize": 10000,
			-       "usedExports": false,
			-     },
			+     "splitChunks": false,
		`)
	);

	test(
		"uniqueName",
		{
			output: {
				uniqueName: "@@@Hello World!",
				trustedTypes: true
			}
		},
		e =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-     "chunkLoadingGlobal": "webpackChunkwebpack",
			+     "chunkLoadingGlobal": "webpackChunk_Hello_World_",
			@@ ... @@
			-     "devtoolNamespace": "webpack",
			+     "devtoolNamespace": "@@@Hello World!",
			@@ ... @@
			-     "hotUpdateGlobal": "webpackHotUpdatewebpack",
			+     "hotUpdateGlobal": "webpackHotUpdate_Hello_World_",
			@@ ... @@
			-     "trustedTypes": undefined,
			-     "uniqueName": "webpack",
			+     "trustedTypes": Object {
			+       "onPolicyCreationFailure": "stop",
			+       "policyName": "@@@Hello_World_",
			+     },
			+     "uniqueName": "@@@Hello World!",
		`)
	);

	test("stats true", { stats: true }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-   "stats": Object {},
		+   "stats": Object {
		+     "preset": "normal",
		+   },
		`)
	);

	test("stats false", { stats: false }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-   "stats": Object {},
		+   "stats": Object {
		+     "preset": "none",
		+   },
		`)
	);

	test("stats string", { stats: "minimal" }, e =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-   "stats": Object {},
		+   "stats": Object {
		+     "preset": "minimal",
		+   },
		`)
	);

	test(
		"browserslist",
		{ context: path.resolve(__dirname, "fixtures/browserslist") },
		e =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-   "context": "<cwd>",
			+   "context": "<cwd>/test/fixtures/browserslist",
			@@ ... @@
			-       "arrowFunction": true,
			-       "asyncFunction": true,
			-       "bigIntLiteral": true,
			-       "const": true,
			-       "destructuring": true,
			+       "arrowFunction": false,
			+       "asyncFunction": false,
			+       "bigIntLiteral": false,
			+       "const": false,
			+       "destructuring": false,
			@@ ... @@
			-       "dynamicImport": undefined,
			-       "dynamicImportInWorker": undefined,
			-       "forOf": true,
			-       "globalThis": undefined,
			-       "module": undefined,
			-       "nodePrefixForCoreModules": true,
			-       "optionalChaining": true,
			-       "templateLiteral": true,
			+       "dynamicImport": false,
			+       "dynamicImportInWorker": false,
			+       "forOf": false,
			+       "globalThis": false,
			+       "module": false,
			+       "nodePrefixForCoreModules": false,
			+       "optionalChaining": false,
			+       "templateLiteral": false,
			@@ ... @@
			-     "chunkLoadingGlobal": "webpackChunkwebpack",
			+     "chunkLoadingGlobal": "webpackChunkbrowserslist_test",
			@@ ... @@
			-     "devtoolNamespace": "webpack",
			+     "devtoolNamespace": "browserslist-test",
			@@ ... @@
			-       "arrowFunction": true,
			-       "asyncFunction": true,
			-       "bigIntLiteral": true,
			-       "const": true,
			-       "destructuring": true,
			+       "arrowFunction": false,
			+       "asyncFunction": false,
			+       "bigIntLiteral": false,
			+       "const": false,
			+       "destructuring": false,
			@@ ... @@
			-       "dynamicImport": undefined,
			-       "dynamicImportInWorker": undefined,
			-       "forOf": true,
			-       "globalThis": undefined,
			-       "module": undefined,
			-       "nodePrefixForCoreModules": true,
			-       "optionalChaining": true,
			-       "templateLiteral": true,
			+       "dynamicImport": false,
			+       "dynamicImportInWorker": false,
			+       "forOf": false,
			+       "globalThis": false,
			+       "module": false,
			+       "nodePrefixForCoreModules": false,
			+       "optionalChaining": false,
			+       "templateLiteral": false,
			@@ ... @@
			-     "hotUpdateGlobal": "webpackHotUpdatewebpack",
			+     "hotUpdateGlobal": "webpackHotUpdatebrowserslist_test",
			@@ ... @@
			-     "uniqueName": "webpack",
			+     "uniqueName": "browserslist-test",
			@@ ... @@
			-       "<cwd>",
			+       "<cwd>/test/fixtures/browserslist",
			@@ ... @@
			-   "target": "web",
			+   "target": "browserslist",
		`)
	);

	test(
		"non-root directory",
		{
			cache: {
				type: "filesystem"
			}
		},
		e =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-   "cache": false,
			-   "context": "<cwd>",
			+   "cache": Object {
			+     "allowCollectingMemory": false,
			+     "buildDependencies": Object {
			+       "defaultWebpack": Array [
			+         "<cwd>/lib/",
			+       ],
			+     },
			+     "cacheDirectory": "<cwd>/node_modules/.cache/webpack",
			+     "cacheLocation": "<cwd>/node_modules/.cache/webpack/default-none",
			+     "compression": false,
			+     "hashAlgorithm": "md4",
			+     "idleTimeout": 60000,
			+     "idleTimeoutAfterLargeChanges": 1000,
			+     "idleTimeoutForInitialStore": 5000,
			+     "maxAge": 5184000000,
			+     "maxMemoryGenerations": Infinity,
			+     "memoryCacheUnaffected": false,
			+     "name": "default-none",
			+     "profile": false,
			+     "readonly": false,
			+     "store": "pack",
			+     "type": "filesystem",
			+     "version": "",
			+   },
			+   "context": "<cwd>/test/fixtures",
			@@ ... @@
			-     "unsafeCache": false,
			+     "unsafeCache": [Function anonymous],
			@@ ... @@
			-     "chunkLoadingGlobal": "webpackChunkwebpack",
			+     "chunkLoadingGlobal": "webpackChunk",
			@@ ... @@
			-     "devtoolNamespace": "webpack",
			+     "devtoolNamespace": "",
			@@ ... @@
			-     "hotUpdateGlobal": "webpackHotUpdatewebpack",
			+     "hotUpdateGlobal": "webpackHotUpdate",
			@@ ... @@
			-     "path": "<cwd>/dist",
			+     "path": "<cwd>/test/fixtures/dist",
			@@ ... @@
			-     "uniqueName": "webpack",
			+     "uniqueName": "",
			@@ ... @@
			-     "cache": false,
			+     "cache": true,
			@@ ... @@
			-       "<cwd>",
			+       "<cwd>/test/fixtures",
			@@ ... @@
			-     "cache": false,
			+     "cache": true,
		`),
		() => {
			process.chdir(path.resolve(__dirname, "fixtures"));
		},
		() => {
			process.chdir(cwd);
		}
	);

	test(
		"array defaults",
		{
			output: {
				enabledChunkLoadingTypes: ["require", "..."],
				enabledWasmLoadingTypes: ["...", "async-node"]
			}
		},
		e =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			+       "require",
			@@ ... @@
			+       "async-node",
		`)
	);

	test(
		"experiments.futureDefaults",
		{
			experiments: {
				futureDefaults: true
			}
		},
		e =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-     "asyncWebAssembly": false,
			-     "backCompat": true,
			+     "asyncWebAssembly": true,
			+     "backCompat": false,
			@@ ... @@
			-     "cacheUnaffected": false,
			-     "css": undefined,
			-     "futureDefaults": false,
			+     "cacheUnaffected": true,
			+     "css": true,
			+     "futureDefaults": true,
			@@ ... @@
			+       },
			+       Object {
			+         "rules": Array [
			+           Object {
			+             "descriptionData": Object {
			+               "type": "module",
			+             },
			+             "resolve": Object {
			+               "fullySpecified": true,
			+             },
			+           },
			+         ],
			+         "test": /\\.wasm$/i,
			+         "type": "webassembly/async",
			+       },
			+       Object {
			+         "mimetype": "application/wasm",
			+         "rules": Array [
			+           Object {
			+             "descriptionData": Object {
			+               "type": "module",
			+             },
			+             "resolve": Object {
			+               "fullySpecified": true,
			+             },
			+           },
			+         ],
			+         "type": "webassembly/async",
			+       },
			+       Object {
			+         "resolve": Object {
			+           "fullySpecified": true,
			+           "preferRelative": true,
			+         },
			+         "test": /\\.css$/i,
			+         "type": "css/auto",
			+       },
			+       Object {
			+         "mimetype": "text/css+module",
			+         "resolve": Object {
			+           "fullySpecified": true,
			+           "preferRelative": true,
			+         },
			+         "type": "css/module",
			+       },
			+       Object {
			+         "mimetype": "text/css",
			+         "resolve": Object {
			+           "fullySpecified": true,
			+           "preferRelative": true,
			+         },
			+         "type": "css",
			@@ ... @@
			-     "generator": Object {},
			+     "generator": Object {
			+       "css": Object {
			+         "esModule": true,
			+         "exportsOnly": false,
			+       },
			+       "css/auto": Object {
			+         "exportsConvention": "as-is",
			+         "localIdentName": "[uniqueName]-[id]-[local]",
			+       },
			+       "css/global": Object {
			+         "exportsConvention": "as-is",
			+         "localIdentName": "[uniqueName]-[id]-[local]",
			+       },
			+       "css/module": Object {
			+         "exportsConvention": "as-is",
			+         "localIdentName": "[uniqueName]-[id]-[local]",
			+       },
			+     },
			@@ ... @@
			+       "css": Object {
			+         "import": true,
			+         "namedExports": true,
			+         "url": true,
			+       },
			@@ ... @@
			+         "exportsPresence": "error",
			@@ ... @@
			-     "__dirname": "mock",
			-     "__filename": "mock",
			-     "global": true,
			+     "__dirname": "warn-mock",
			+     "__filename": "warn-mock",
			+     "global": "warn",
			@@ ... @@
			+         "css",
			@@ ... @@
			-     "hashDigestLength": 20,
			-     "hashFunction": "md4",
			+     "hashDigestLength": 16,
			+     "hashFunction": "xxhash64",
			@@ ... @@
			+           "...",
			+         ],
			+       },
			+       "css-import": Object {
			+         "conditionNames": Array [
			+           "webpack",
			+           "production",
			+           "style",
			+         ],
			+         "extensions": Array [
			+           ".css",
			+         ],
			+         "mainFields": Array [
			+           "style",
			@@ ... @@
			+         "mainFiles": Array [],
			+         "preferRelative": true,
			@@ ... @@
			-       "<cwd>/node_modules/",
			+       /^(.+?[\\\\/]node_modules[\\\\/])/,
		`)
	);

	test(
		"experiments.futureDefaults w/ experiments.css disabled",
		{
			experiments: {
				css: false,
				futureDefaults: true
			}
		},
		e =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-     "asyncWebAssembly": false,
			-     "backCompat": true,
			+     "asyncWebAssembly": true,
			+     "backCompat": false,
			@@ ... @@
			-     "cacheUnaffected": false,
			-     "css": undefined,
			-     "futureDefaults": false,
			+     "cacheUnaffected": true,
			+     "css": false,
			+     "futureDefaults": true,
			@@ ... @@
			+       Object {
			+         "rules": Array [
			@@ ... @@
			+             "descriptionData": Object {
			+               "type": "module",
			+             },
			+             "resolve": Object {
			+               "fullySpecified": true,
			+             },
			+           },
			+         ],
			+         "test": /\\.wasm$/i,
			+         "type": "webassembly/async",
			+       },
			+       Object {
			+         "mimetype": "application/wasm",
			+         "rules": Array [
			+           Object {
			+             "descriptionData": Object {
			+               "type": "module",
			+             },
			+             "resolve": Object {
			+               "fullySpecified": true,
			+             },
			+           },
			+         ],
			+         "type": "webassembly/async",
			+       },
			+       Object {
			@@ ... @@
			+         "exportsPresence": "error",
			@@ ... @@
			-     "__dirname": "mock",
			-     "__filename": "mock",
			-     "global": true,
			+     "__dirname": "warn-mock",
			+     "__filename": "warn-mock",
			+     "global": "warn",
			@@ ... @@
			-     "hashDigestLength": 20,
			-     "hashFunction": "md4",
			+     "hashDigestLength": 16,
			+     "hashFunction": "xxhash64",
			@@ ... @@
			-       "<cwd>/node_modules/",
			+       /^(.+?[\\\\/]node_modules[\\\\/])/,
		`)
	);
});

it("should result in the same target options for same target", () => {
	const inlineTarget = getDefaultConfig({ target: "node12.17" });
	const browserslistTarget = getDefaultConfig({
		target: "browserslist: node 12.17"
	});
	const diff = stripAnsi(
		jestDiff(inlineTarget, browserslistTarget, {
			expand: false,
			contextLines: 0
		})
	);

	expect(inlineTarget.output.environment.module).toBe(true);
	expect(inlineTarget.output.environment.dynamicImport).toBe(true);
	expect(new Diff(diff)).toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-   "target": "node12.17",
		+   "target": "browserslist: node 12.17",
	`);
});
