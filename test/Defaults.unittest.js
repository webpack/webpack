"use strict";

require("./helpers/warmup-webpack");

const nodeModuleApi = require("module");
const path = require("path");
const jestDiff = require("jest-diff").diff;
const stripVTControlCharacters = require("./helpers/stripVTControlCharacters");

// Stub `stripTypeScriptTypes` (Node.js >= 22.6) on runtimes lacking it (Bun/Deno)
// so the `typescript: "auto"` default resolves on, keeping snapshots identical.
const anyNodeModuleApi = /** @type {EXPECTED_ANY} */ (nodeModuleApi);
const hadStripTypeScriptTypes =
	typeof anyNodeModuleApi.stripTypeScriptTypes === "function";
if (!hadStripTypeScriptTypes) {
	anyNodeModuleApi.stripTypeScriptTypes = (/** @type {string} */ source) =>
		source;
}
// eslint-disable-next-line jest/require-top-level-describe, jest/padding-around-after-all-blocks
afterAll(() => {
	if (!hadStripTypeScriptTypes) {
		delete anyNodeModuleApi.stripTypeScriptTypes;
	}
});

/** @typedef {import("../lib/index").Configuration} Configuration */
/** @typedef {import("../lib/index").WebpackOptionsNormalized} WebpackOptionsNormalized */
/** @typedef {ReturnType<expect>} ExceptResult */

/**
 * Escapes regular expression metacharacters
 * @param {string} str String to quote
 * @returns {string} Escaped string
 */
const quoteMeta = (str) => str.replace(/[-[\]\\/{}()*+?.^$|]/g, "\\$&");

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

/**
 * @param {string} str string
 * @returns {string} normalized string
 */
const normalize = (str) => {
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
	/**
	 * @param {string} value value
	 */
	constructor(value) {
		this.value = value;
	}
}

expect.addSnapshotSerializer({
	test(value) {
		return value instanceof Diff;
	},
	/**
	 * @param {unknown} received received
	 * @returns {string} result
	 */
	print(received) {
		return normalize(/** @type {Diff} */ (received).value);
	}
});

expect.addSnapshotSerializer({
	test(value) {
		return typeof value === "string";
	},
	/**
	 * @param {unknown} received received
	 * @returns {string} result
	 */
	print(received) {
		return JSON.stringify(normalize(/** @type {string} */ (received)));
	}
});

/**
 * @param {Configuration} config configuration
 * @returns {WebpackOptionsNormalized} normalized configuration
 */
const getDefaultConfig = (config) => {
	const { applyWebpackOptionsDefaults, getNormalizedWebpackOptions } =
		require("..").config;

	const normalized = getNormalizedWebpackOptions(
		/** @type {EXPECTED_ANY} */ (config)
	);
	applyWebpackOptionsDefaults(/** @type {EXPECTED_ANY} */ (normalized));
	process.chdir(cwd);
	return /** @type {WebpackOptionsNormalized} */ (normalized);
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
		  "dotenv": undefined,
		  "entry": Object {
		    "main": Object {
		      "import": Array [
		        "./src",
		      ],
		    },
		  },
		  "experiments": Object {
		    "asyncWebAssembly": true,
		    "backCompat": true,
		    "buildHttp": undefined,
		    "cacheUnaffected": false,
		    "css": true,
		    "deferImport": false,
		    "futureDefaults": false,
		    "html": true,
		    "lazyCompilation": undefined,
		    "outputModule": false,
		    "sourceImport": false,
		    "syncWebAssembly": false,
		    "typescript": true,
		  },
		  "externals": undefined,
		  "externalsPresets": Object {
		    "bun": false,
		    "deno": false,
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
		  "infrastructureLogging": Object {
		    "progress": false,
		  },
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
		      "generator": true,
		      "globalThis": undefined,
		      "hasOwn": undefined,
		      "importMetaDirnameAndFilename": undefined,
		      "let": true,
		      "logicalAssignment": undefined,
		      "methodShorthand": true,
		      "module": undefined,
		      "modulePreload": true,
		      "nodeBuiltinModuleGetter": undefined,
		      "nodePrefixForCoreModules": true,
		      "optionalChaining": true,
		      "spread": true,
		      "symbol": true,
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
		        "rules": Array [
		          Object {
		            "descriptionData": Object {
		              "type": "module",
		            },
		            "resolve": Object {
		              "fullySpecified": true,
		            },
		          },
		        ],
		        "test": /\\\\\\.wasm\\$/i,
		        "type": "webassembly/async",
		      },
		      Object {
		        "mimetype": "application/wasm",
		        "rules": Array [
		          Object {
		            "descriptionData": Object {
		              "type": "module",
		            },
		            "resolve": Object {
		              "fullySpecified": true,
		            },
		          },
		        ],
		        "type": "webassembly/async",
		      },
		      Object {
		        "resolve": Object {
		          "fullySpecified": true,
		          "preferRelative": true,
		        },
		        "test": /\\\\\\.css\\$/i,
		        "type": "css/auto",
		      },
		      Object {
		        "mimetype": "text/css+module",
		        "resolve": Object {
		          "fullySpecified": true,
		          "preferRelative": true,
		        },
		        "type": "css/module",
		      },
		      Object {
		        "mimetype": "text/css",
		        "resolve": Object {
		          "fullySpecified": true,
		          "preferRelative": true,
		        },
		        "type": "css",
		      },
		      Object {
		        "dependency": /css-import-local-module/,
		        "exclude": /\\\\\\.module\\\\\\.\\\\w\\+\\$/i,
		        "resolve": Object {
		          "fullySpecified": true,
		          "preferRelative": true,
		        },
		        "type": "css/module",
		      },
		      Object {
		        "dependency": /css-import-global-module/,
		        "exclude": /\\\\\\.module\\\\\\.\\\\w\\+\\$/i,
		        "resolve": Object {
		          "fullySpecified": true,
		          "preferRelative": true,
		        },
		        "type": "css/global",
		      },
		      Object {
		        "parser": Object {
		          "exportType": "css-style-sheet",
		        },
		        "resolve": Object {
		          "fullySpecified": true,
		          "preferRelative": true,
		        },
		        "with": Object {
		          "type": "css",
		        },
		      },
		      Object {
		        "assert": Object {
		          "type": "css",
		        },
		        "parser": Object {
		          "exportType": "css-style-sheet",
		        },
		        "resolve": Object {
		          "fullySpecified": true,
		          "preferRelative": true,
		        },
		      },
		      Object {
		        "resolve": Object {
		          "fullySpecified": true,
		          "preferRelative": true,
		        },
		        "test": /\\\\\\.html\\$/i,
		        "type": "html",
		      },
		      Object {
		        "mimetype": "text/html",
		        "resolve": Object {
		          "fullySpecified": true,
		          "preferRelative": true,
		        },
		        "type": "html",
		      },
		      Object {
		        "dependency": "html-srcdoc",
		        "generator": Object {
		          "extract": "inline",
		        },
		        "resolve": Object {
		          "fullySpecified": true,
		          "preferRelative": true,
		        },
		      },
		      Object {
		        "dependency": "html-style",
		        "parser": Object {
		          "exportType": "text",
		        },
		        "resolve": Object {
		          "fullySpecified": true,
		          "preferRelative": true,
		        },
		      },
		      Object {
		        "dependency": "html-style-attribute",
		        "parser": Object {
		          "as": "block-contents",
		          "exportType": "text",
		        },
		        "resolve": Object {
		          "fullySpecified": true,
		          "preferRelative": true,
		        },
		      },
		      Object {
		        "resolve": Object {
		          "byDependency": Object {
		            "esm": Object {
		              "fullySpecified": true,
		            },
		          },
		        },
		        "test": /\\\\\\.mts\\$/i,
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
		        "test": /\\\\\\.ts\\$/i,
		        "type": "javascript/esm",
		      },
		      Object {
		        "test": /\\\\\\.cts\\$/i,
		        "type": "javascript/dynamic",
		      },
		      Object {
		        "descriptionData": Object {
		          "type": "commonjs",
		        },
		        "test": /\\\\\\.ts\\$/i,
		        "type": "javascript/dynamic",
		      },
		      Object {
		        "mimetype": Object {
		          "or": Array [
		            "text/typescript",
		            "application/typescript",
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
		        "parser": Object {
		          "namedExports": false,
		        },
		        "type": "json",
		        "with": Object {
		          "type": "json",
		        },
		      },
		      Object {
		        "assert": Object {
		          "type": "json",
		        },
		        "parser": Object {
		          "namedExports": false,
		        },
		        "type": "json",
		      },
		      Object {
		        "type": "asset/source",
		        "with": Object {
		          "type": "text",
		        },
		      },
		      Object {
		        "type": "asset/bytes",
		        "with": Object {
		          "type": "bytes",
		        },
		      },
		      Object {
		        "dependency": "url",
		        "test": /\\\\\\.webmanifest\\$/i,
		        "type": "asset/webmanifest",
		      },
		    ],
		    "generator": Object {
		      "css": Object {
		        "esModule": true,
		        "exportsOnly": false,
		      },
		      "css/auto": Object {
		        "exportsConvention": "as-is",
		        "localIdentHashDigest": "base64url",
		        "localIdentHashDigestLength": 6,
		        "localIdentHashFunction": "md4",
		        "localIdentHashSalt": undefined,
		        "localIdentName": "[fullhash]",
		      },
		      "css/global": Object {
		        "exportsConvention": "as-is",
		        "localIdentHashDigest": "base64url",
		        "localIdentHashDigestLength": 6,
		        "localIdentHashFunction": "md4",
		        "localIdentHashSalt": undefined,
		        "localIdentName": "[fullhash]",
		      },
		      "css/module": Object {
		        "exportsConvention": "as-is",
		        "localIdentHashDigest": "base64url",
		        "localIdentHashDigestLength": 6,
		        "localIdentHashFunction": "md4",
		        "localIdentHashSalt": undefined,
		        "localIdentName": "[fullhash]",
		      },
		      "html": Object {},
		      "json": Object {
		        "JSONParse": true,
		      },
		    },
		    "noParse": undefined,
		    "parser": Object {
		      "asset": Object {
		        "dataUrlCondition": Object {
		          "maxSize": 8096,
		        },
		      },
		      "css": Object {
		        "customMedia": true,
		        "customSelectors": true,
		        "import": true,
		        "namedExports": true,
		        "url": true,
		      },
		      "css/auto": Object {
		        "animation": true,
		        "container": true,
		        "customIdents": true,
		        "customMedia": true,
		        "customSelectors": true,
		        "dashedIdents": true,
		        "function": true,
		        "grid": true,
		      },
		      "css/global": Object {
		        "animation": true,
		        "container": true,
		        "customIdents": true,
		        "customMedia": true,
		        "customSelectors": true,
		        "dashedIdents": true,
		        "function": true,
		        "grid": true,
		      },
		      "css/module": Object {
		        "animation": true,
		        "container": true,
		        "customIdents": true,
		        "customMedia": true,
		        "customSelectors": true,
		        "dashedIdents": true,
		        "function": true,
		        "grid": true,
		      },
		      "html": Object {
		        "sources": true,
		      },
		      "javascript": Object {
		        "anonymousDefaultExportName": true,
		        "createRequire": false,
		        "deferImport": false,
		        "dynamicImportFetchPriority": false,
		        "dynamicImportMode": "lazy",
		        "dynamicImportPrefetch": false,
		        "dynamicImportPreload": false,
		        "dynamicUrl": true,
		        "exprContextCritical": true,
		        "exprContextRecursive": true,
		        "exprContextRegExp": false,
		        "exprContextRequest": ".",
		        "importMeta": true,
		        "sourceImport": false,
		        "strictExportPresence": undefined,
		        "strictModeViolations": "warn",
		        "strictThisContextOnImports": false,
		        "typescript": true,
		        "unknownContextCritical": true,
		        "unknownContextRecursive": true,
		        "unknownContextRegExp": false,
		        "unknownContextRequest": ".",
		        "wrappedContextCritical": false,
		        "wrappedContextRecursive": true,
		        "wrappedContextRegExp": /\\.\\*/,
		      },
		      "json": Object {
		        "exportsDepth": Infinity,
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
		    "inlineExports": false,
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
		        "css",
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
		    "assetModuleFilename": "[hash][ext][query][fragment]",
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
		      "generator": true,
		      "globalThis": undefined,
		      "hasOwn": undefined,
		      "importMetaDirnameAndFilename": undefined,
		      "let": true,
		      "logicalAssignment": undefined,
		      "methodShorthand": true,
		      "module": undefined,
		      "modulePreload": true,
		      "nodeBuiltinModuleGetter": undefined,
		      "nodePrefixForCoreModules": true,
		      "optionalChaining": true,
		      "spread": true,
		      "symbol": true,
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
		    "html": false,
		    "htmlChunkFilename": "[name].html",
		    "htmlFilename": "[name].html",
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
		    "strictModuleResolution": false,
		    "trustedTypes": undefined,
		    "uniqueName": "webpack",
		    "wasmLoading": "fetch",
		    "wasmStreamingFallback": true,
		    "webassemblyModuleFilename": "[hash].module.wasm",
		    "workerChunkFilename": "[name].js",
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
		          "typescript",
		          "require",
		          "module-sync",
		          "module",
		          "...",
		        ],
		        "extensions": Array [
		          ".ts",
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
		          "typescript",
		          "require",
		          "module-sync",
		          "module",
		          "...",
		        ],
		        "extensions": Array [
		          ".ts",
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
		      "css-import": Object {
		        "conditionNames": Array [
		          "webpack",
		          "production",
		          "style",
		        ],
		        "extensions": Array [
		          ".css",
		        ],
		        "mainFields": Array [
		          "style",
		          "...",
		        ],
		        "mainFiles": Array [],
		        "preferRelative": true,
		      },
		      "css-import-global-module": Object {
		        "conditionNames": Array [
		          "webpack",
		          "production",
		          "style",
		        ],
		        "extensions": Array [
		          ".css",
		        ],
		        "mainFields": Array [
		          "style",
		          "...",
		        ],
		        "mainFiles": Array [],
		        "preferRelative": true,
		      },
		      "css-import-local-module": Object {
		        "conditionNames": Array [
		          "webpack",
		          "production",
		          "style",
		        ],
		        "extensions": Array [
		          ".css",
		        ],
		        "mainFields": Array [
		          "style",
		          "...",
		        ],
		        "mainFiles": Array [],
		        "preferRelative": true,
		      },
		      "esm": Object {
		        "aliasFields": Array [
		          "browser",
		        ],
		        "conditionNames": Array [
		          "typescript",
		          "import",
		          "module-sync",
		          "module",
		          "...",
		        ],
		        "extensions": Array [
		          ".ts",
		          ".js",
		          ".json",
		          ".wasm",
		          ".html",
		          ".css",
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
		          "typescript",
		          "require",
		          "module-sync",
		          "module",
		          "...",
		        ],
		        "extensions": Array [
		          ".ts",
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
		          "typescript",
		          "import",
		          "module-sync",
		          "module",
		          "...",
		        ],
		        "extensions": Array [
		          ".ts",
		          ".js",
		          ".json",
		          ".wasm",
		          ".html",
		          ".css",
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
		          "typescript",
		          "require",
		          "module-sync",
		          "module",
		          "...",
		        ],
		        "extensions": Array [
		          ".ts",
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
		          "typescript",
		          "require",
		          "module-sync",
		          "module",
		          "...",
		        ],
		        "extensions": Array [
		          ".ts",
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
		          "typescript",
		          "import",
		          "module-sync",
		          "module",
		          "...",
		        ],
		        "extensions": Array [
		          ".ts",
		          ".js",
		          ".json",
		          ".wasm",
		          ".html",
		          ".css",
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
		          "worker",
		          "typescript",
		          "import",
		          "module-sync",
		          "module",
		          "...",
		        ],
		        "extensions": Array [
		          ".ts",
		          ".js",
		          ".json",
		          ".wasm",
		          ".html",
		          ".css",
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
		    "extensionAlias": Object {
		      ".cjs": Array [
		        ".cjs",
		        ".cts",
		      ],
		      ".js": Array [
		        ".js",
		        ".ts",
		      ],
		      ".mjs": Array [
		        ".mjs",
		        ".mts",
		      ],
		    },
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
		    "tsconfig": true,
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
		    "contextModule": Object {
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
		  "validate": true,
		  "watch": false,
		  "watchOptions": Object {},
		}
	`);
	});

	/**
	 * @param {string} name name
	 * @param {Configuration} options options
	 * @param {(result1: ExceptResult, result2: ExceptResult) => void} fn expect result
	 * @param {() => void=} before before
	 * @param {() => void=} after after
	 */
	const test = (name, options, fn, before, after) => {
		it(`should generate the correct defaults from ${name}`, () => {
			if (!("mode" in options)) options.mode = "none";
			try {
				if (before) before();
				const result = getDefaultConfig(options);

				const diff = stripVTControlCharacters(
					/** @type {string} */
					(jestDiff(baseConfig, result, { expand: false, contextLines: 0 }))
				);

				fn(expect(new Diff(diff)), expect(result));
			} finally {
				if (after) after();
			}
		});
	};

	test("empty config", {}, (e) =>
		e.toMatchInlineSnapshot("Compared values have no visual difference.")
	);

	test("none mode", { mode: "none" }, (e) =>
		e.toMatchInlineSnapshot("Compared values have no visual difference.")
	);

	test("no mode provided", { mode: undefined }, (e) =>
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
		-     "inlineExports": false,
		-     "innerGraph": false,
		-     "mangleExports": false,
		+     "avoidEntryIife": true,
		+     "checkWasmTypes": true,
		+     "chunkIds": "deterministic",
		+     "concatenateModules": true,
		+     "emitOnErrors": false,
		+     "flagIncludedChunks": true,
		+     "inlineExports": true,
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

	test("production", { mode: "production" }, (e) =>
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
		-     "inlineExports": false,
		-     "innerGraph": false,
		-     "mangleExports": false,
		+     "avoidEntryIife": true,
		+     "checkWasmTypes": true,
		+     "chunkIds": "deterministic",
		+     "concatenateModules": true,
		+     "emitOnErrors": false,
		+     "flagIncludedChunks": true,
		+     "inlineExports": true,
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

	test("development", { mode: "development" }, (e) =>
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
		+   "devtool": Array [
		+     Object {
		+       "type": "css",
		+       "use": "source-map",
		+     },
		+     Object {
		+       "type": "javascript",
		+       "use": "eval",
		+     },
		+   ],
		@@ ... @@
		-   "mode": "none",
		+   "mode": "development",
		@@ ... @@
		-         "localIdentName": "[fullhash]",
		+         "localIdentName": "[uniqueName]-[id]-[local]",
		@@ ... @@
		-         "localIdentName": "[fullhash]",
		+         "localIdentName": "[uniqueName]-[id]-[local]",
		@@ ... @@
		-         "localIdentName": "[fullhash]",
		+         "localIdentName": "[uniqueName]-[id]-[local]",
		@@ ... @@
		-         "exportsDepth": Infinity,
		+         "exportsDepth": 1,
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
		-     "pathinfo": false,
		+     "pathinfo": true,
		@@ ... @@
		-     "strictModuleResolution": false,
		+     "strictModuleResolution": true,
		@@ ... @@
		-           "production",
		+           "development",
		@@ ... @@
		-           "production",
		+           "development",
		@@ ... @@
		-           "production",
		+           "development",
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

	test("sync wasm", { experiments: { syncWebAssembly: true } }, (e) =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "asyncWebAssembly": true,
		+     "asyncWebAssembly": false,
		@@ ... @@
		-     "syncWebAssembly": false,
		+     "syncWebAssembly": true,
		@@ ... @@
		-         "type": "webassembly/async",
		+         "type": "webassembly/sync",
		@@ ... @@
		-         "type": "webassembly/async",
		+         "type": "webassembly/sync",
	`)
	);

	test("output module", { experiments: { outputModule: true } }, (e) =>
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
		-         "importMeta": true,
		+         "importMeta": "preserve-unknown",
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
		-     "hotUpdateMainFilename": "[runtime].[fullhash].hot-update.json",
		+     "hotUpdateMainFilename": "[runtime].[fullhash].hot-update.json.mjs",
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
		-     "workerChunkFilename": "[name].js",
		-     "workerChunkLoading": "import-scripts",
		+     "workerChunkFilename": "[name].mjs",
		+     "workerChunkLoading": "import",
	`)
	);

	test("async wasm", { experiments: { asyncWebAssembly: true } }, (e) =>
		e.toMatchInlineSnapshot("Compared values have no visual difference.")
	);

	test(
		"both wasm",
		{ experiments: { syncWebAssembly: true, asyncWebAssembly: true } },
		(e) =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-     "syncWebAssembly": false,
			+     "syncWebAssembly": true,
		`)
	);

	test("const filename", { output: { filename: "bundle.js" } }, (e) =>
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
		@@ ... @@
		-     "htmlChunkFilename": "[name].html",
		+     "htmlChunkFilename": "[id].bundle.html",
		@@ ... @@
		-     "workerChunkFilename": "[name].js",
		+     "workerChunkFilename": "[id].bundle.js",
	`)
	);

	test("function filename", { output: { filename: () => "bundle.js" } }, (e) =>
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
		@@ ... @@
		-     "htmlChunkFilename": "[name].html",
		+     "htmlChunkFilename": "[id].html",
		@@ ... @@
		-     "workerChunkFilename": "[name].js",
		+     "workerChunkFilename": "[id].js",
	`)
	);

	test("library", { output: { library: ["myLib", "awesome"] } }, (e) =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-         "anonymousDefaultExportName": true,
		+         "anonymousDefaultExportName": false,
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
		(e) =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-         "anonymousDefaultExportName": true,
			+         "anonymousDefaultExportName": false,
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
		(e) =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-         "anonymousDefaultExportName": true,
			+         "anonymousDefaultExportName": false,
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
		(e) =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-         "anonymousDefaultExportName": true,
			+         "anonymousDefaultExportName": false,
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
		(e) =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-         "anonymousDefaultExportName": true,
			+         "anonymousDefaultExportName": false,
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

	test("target node", { target: "node" }, (e) =>
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
		-         "exportsOnly": false,
		+         "exportsOnly": true,
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

	test("target deno", { target: "deno" }, (e) =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "outputModule": false,
		+     "outputModule": true,
		@@ ... @@
		-     "deno": false,
		+     "deno": true,
		@@ ... @@
		-   "externalsType": "var",
		+   "externalsType": "module-import",
		@@ ... @@
		-       "document": true,
		-       "dynamicImport": undefined,
		-       "dynamicImportInWorker": undefined,
		+       "document": false,
		+       "dynamicImport": true,
		+       "dynamicImportInWorker": true,
		@@ ... @@
		-       "globalThis": undefined,
		-       "hasOwn": undefined,
		+       "globalThis": true,
		+       "hasOwn": true,
		@@ ... @@
		-       "logicalAssignment": undefined,
		+       "logicalAssignment": true,
		@@ ... @@
		-       "module": undefined,
		+       "module": true,
		@@ ... @@
		-     "target": "web",
		+     "target": "deno",
		@@ ... @@
		-         "exportsOnly": false,
		+         "exportsOnly": true,
		@@ ... @@
		-         "createRequire": false,
		+         "createRequire": true,
		@@ ... @@
		-         "importMeta": true,
		+         "importMeta": "preserve-unknown",
		@@ ... @@
		-     "__dirname": "mock",
		-     "__filename": "mock",
		+     "__dirname": "eval-only",
		+     "__filename": "eval-only",
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
		-       "document": true,
		-       "dynamicImport": undefined,
		-       "dynamicImportInWorker": undefined,
		+       "document": false,
		+       "dynamicImport": true,
		+       "dynamicImportInWorker": true,
		@@ ... @@
		-       "globalThis": undefined,
		-       "hasOwn": undefined,
		+       "globalThis": true,
		+       "hasOwn": true,
		@@ ... @@
		-       "logicalAssignment": undefined,
		+       "logicalAssignment": true,
		@@ ... @@
		-       "module": undefined,
		+       "module": true,
		@@ ... @@
		-     "filename": "[name].js",
		-     "globalObject": "self",
		+     "filename": "[name].mjs",
		+     "globalObject": "globalThis",
		@@ ... @@
		-     "hotUpdateChunkFilename": "[id].[fullhash].hot-update.js",
		+     "hotUpdateChunkFilename": "[id].[fullhash].hot-update.mjs",
		@@ ... @@
		-     "hotUpdateMainFilename": "[runtime].[fullhash].hot-update.json",
		+     "hotUpdateMainFilename": "[runtime].[fullhash].hot-update.json.mjs",
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
		-     "workerChunkFilename": "[name].js",
		-     "workerChunkLoading": "import-scripts",
		+     "workerChunkFilename": "[name].mjs",
		+     "workerChunkLoading": "import",
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
		+       "deno",
		+       "node",
		@@ ... @@
		-   "target": "web",
		+   "target": "deno",
	`)
	);

	test("target deno1.40", { target: "deno1.40" }, (e) =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "outputModule": false,
		+     "outputModule": true,
		@@ ... @@
		-     "deno": false,
		+     "deno": true,
		@@ ... @@
		-   "externalsType": "var",
		+   "externalsType": "module-import",
		@@ ... @@
		-       "document": true,
		-       "dynamicImport": undefined,
		-       "dynamicImportInWorker": undefined,
		+       "document": false,
		+       "dynamicImport": true,
		+       "dynamicImportInWorker": true,
		@@ ... @@
		-       "globalThis": undefined,
		-       "hasOwn": undefined,
		-       "importMetaDirnameAndFilename": undefined,
		+       "globalThis": true,
		+       "hasOwn": true,
		+       "importMetaDirnameAndFilename": true,
		@@ ... @@
		-       "logicalAssignment": undefined,
		+       "logicalAssignment": true,
		@@ ... @@
		-       "module": undefined,
		+       "module": true,
		@@ ... @@
		-       "nodeBuiltinModuleGetter": undefined,
		+       "nodeBuiltinModuleGetter": false,
		@@ ... @@
		-     "target": "web",
		+     "target": "deno",
		@@ ... @@
		-         "exportsOnly": false,
		+         "exportsOnly": true,
		@@ ... @@
		-         "createRequire": false,
		+         "createRequire": true,
		@@ ... @@
		-         "importMeta": true,
		+         "importMeta": "preserve-unknown",
		@@ ... @@
		-     "__dirname": "mock",
		-     "__filename": "mock",
		+     "__dirname": "eval-only",
		+     "__filename": "eval-only",
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
		-       "document": true,
		-       "dynamicImport": undefined,
		-       "dynamicImportInWorker": undefined,
		+       "document": false,
		+       "dynamicImport": true,
		+       "dynamicImportInWorker": true,
		@@ ... @@
		-       "globalThis": undefined,
		-       "hasOwn": undefined,
		-       "importMetaDirnameAndFilename": undefined,
		+       "globalThis": true,
		+       "hasOwn": true,
		+       "importMetaDirnameAndFilename": true,
		@@ ... @@
		-       "logicalAssignment": undefined,
		+       "logicalAssignment": true,
		@@ ... @@
		-       "module": undefined,
		+       "module": true,
		@@ ... @@
		-       "nodeBuiltinModuleGetter": undefined,
		+       "nodeBuiltinModuleGetter": false,
		@@ ... @@
		-     "filename": "[name].js",
		-     "globalObject": "self",
		+     "filename": "[name].mjs",
		+     "globalObject": "globalThis",
		@@ ... @@
		-     "hotUpdateChunkFilename": "[id].[fullhash].hot-update.js",
		+     "hotUpdateChunkFilename": "[id].[fullhash].hot-update.mjs",
		@@ ... @@
		-     "hotUpdateMainFilename": "[runtime].[fullhash].hot-update.json",
		+     "hotUpdateMainFilename": "[runtime].[fullhash].hot-update.json.mjs",
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
		-     "workerChunkFilename": "[name].js",
		-     "workerChunkLoading": "import-scripts",
		+     "workerChunkFilename": "[name].mjs",
		+     "workerChunkLoading": "import",
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
		+       "deno",
		+       "node",
		@@ ... @@
		-   "target": "web",
		+   "target": "deno1.40",
	`)
	);

	test("target bun", { target: "bun" }, (e) =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "outputModule": false,
		+     "outputModule": true,
		@@ ... @@
		-     "bun": false,
		+     "bun": true,
		@@ ... @@
		-     "web": true,
		+     "web": false,
		@@ ... @@
		-   "externalsType": "var",
		+   "externalsType": "module-import",
		@@ ... @@
		-       "document": true,
		-       "dynamicImport": undefined,
		-       "dynamicImportInWorker": undefined,
		+       "document": false,
		+       "dynamicImport": true,
		+       "dynamicImportInWorker": true,
		@@ ... @@
		-       "globalThis": undefined,
		-       "hasOwn": undefined,
		-       "importMetaDirnameAndFilename": undefined,
		+       "globalThis": true,
		+       "hasOwn": true,
		+       "importMetaDirnameAndFilename": true,
		@@ ... @@
		-       "logicalAssignment": undefined,
		+       "logicalAssignment": true,
		@@ ... @@
		-       "module": undefined,
		+       "module": true,
		@@ ... @@
		-       "nodeBuiltinModuleGetter": undefined,
		+       "nodeBuiltinModuleGetter": true,
		@@ ... @@
		-     "target": "web",
		+     "target": "bun",
		@@ ... @@
		-         "exportsOnly": false,
		+         "exportsOnly": true,
		@@ ... @@
		-         "createRequire": false,
		+         "createRequire": true,
		@@ ... @@
		-         "importMeta": true,
		+         "importMeta": "preserve-unknown",
		@@ ... @@
		-     "__dirname": "mock",
		-     "__filename": "mock",
		+     "__dirname": "eval-only",
		+     "__filename": "eval-only",
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
		-       "document": true,
		-       "dynamicImport": undefined,
		-       "dynamicImportInWorker": undefined,
		+       "document": false,
		+       "dynamicImport": true,
		+       "dynamicImportInWorker": true,
		@@ ... @@
		-       "globalThis": undefined,
		-       "hasOwn": undefined,
		-       "importMetaDirnameAndFilename": undefined,
		+       "globalThis": true,
		+       "hasOwn": true,
		+       "importMetaDirnameAndFilename": true,
		@@ ... @@
		-       "logicalAssignment": undefined,
		+       "logicalAssignment": true,
		@@ ... @@
		-       "module": undefined,
		+       "module": true,
		@@ ... @@
		-       "nodeBuiltinModuleGetter": undefined,
		+       "nodeBuiltinModuleGetter": true,
		@@ ... @@
		-     "filename": "[name].js",
		-     "globalObject": "self",
		+     "filename": "[name].mjs",
		+     "globalObject": "globalThis",
		@@ ... @@
		-     "hotUpdateChunkFilename": "[id].[fullhash].hot-update.js",
		+     "hotUpdateChunkFilename": "[id].[fullhash].hot-update.mjs",
		@@ ... @@
		-     "hotUpdateMainFilename": "[runtime].[fullhash].hot-update.json",
		+     "hotUpdateMainFilename": "[runtime].[fullhash].hot-update.json.mjs",
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
		-     "workerChunkFilename": "[name].js",
		-     "workerChunkLoading": "import-scripts",
		+     "workerChunkFilename": "[name].mjs",
		+     "workerChunkLoading": "import",
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
		+       "bun",
		+       "node",
		@@ ... @@
		-   "target": "web",
		+   "target": "bun",
	`)
	);

	test("target bun1.1", { target: "bun1.1" }, (e) =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-     "outputModule": false,
		+     "outputModule": true,
		@@ ... @@
		-     "bun": false,
		+     "bun": true,
		@@ ... @@
		-     "web": true,
		+     "web": false,
		@@ ... @@
		-   "externalsType": "var",
		+   "externalsType": "module-import",
		@@ ... @@
		-       "document": true,
		-       "dynamicImport": undefined,
		-       "dynamicImportInWorker": undefined,
		+       "document": false,
		+       "dynamicImport": true,
		+       "dynamicImportInWorker": true,
		@@ ... @@
		-       "globalThis": undefined,
		-       "hasOwn": undefined,
		-       "importMetaDirnameAndFilename": undefined,
		+       "globalThis": true,
		+       "hasOwn": true,
		+       "importMetaDirnameAndFilename": true,
		@@ ... @@
		-       "logicalAssignment": undefined,
		+       "logicalAssignment": true,
		@@ ... @@
		-       "module": undefined,
		+       "module": true,
		@@ ... @@
		-       "nodeBuiltinModuleGetter": undefined,
		+       "nodeBuiltinModuleGetter": true,
		@@ ... @@
		-     "target": "web",
		+     "target": "bun",
		@@ ... @@
		-         "exportsOnly": false,
		+         "exportsOnly": true,
		@@ ... @@
		-         "createRequire": false,
		+         "createRequire": true,
		@@ ... @@
		-         "importMeta": true,
		+         "importMeta": "preserve-unknown",
		@@ ... @@
		-     "__dirname": "mock",
		-     "__filename": "mock",
		+     "__dirname": "eval-only",
		+     "__filename": "eval-only",
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
		-       "document": true,
		-       "dynamicImport": undefined,
		-       "dynamicImportInWorker": undefined,
		+       "document": false,
		+       "dynamicImport": true,
		+       "dynamicImportInWorker": true,
		@@ ... @@
		-       "globalThis": undefined,
		-       "hasOwn": undefined,
		-       "importMetaDirnameAndFilename": undefined,
		+       "globalThis": true,
		+       "hasOwn": true,
		+       "importMetaDirnameAndFilename": true,
		@@ ... @@
		-       "logicalAssignment": undefined,
		+       "logicalAssignment": true,
		@@ ... @@
		-       "module": undefined,
		+       "module": true,
		@@ ... @@
		-       "nodeBuiltinModuleGetter": undefined,
		+       "nodeBuiltinModuleGetter": true,
		@@ ... @@
		-     "filename": "[name].js",
		-     "globalObject": "self",
		+     "filename": "[name].mjs",
		+     "globalObject": "globalThis",
		@@ ... @@
		-     "hotUpdateChunkFilename": "[id].[fullhash].hot-update.js",
		+     "hotUpdateChunkFilename": "[id].[fullhash].hot-update.mjs",
		@@ ... @@
		-     "hotUpdateMainFilename": "[runtime].[fullhash].hot-update.json",
		+     "hotUpdateMainFilename": "[runtime].[fullhash].hot-update.json.mjs",
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
		-     "workerChunkFilename": "[name].js",
		-     "workerChunkLoading": "import-scripts",
		+     "workerChunkFilename": "[name].mjs",
		+     "workerChunkLoading": "import",
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
		+       "bun",
		+       "node",
		@@ ... @@
		-   "target": "web",
		+   "target": "bun1.1",
	`)
	);

	test("target webworker", { target: "webworker" }, (e) =>
		e.toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-       "document": true,
		+       "document": false,
		@@ ... @@
		-         "exportsOnly": false,
		+         "exportsOnly": true,
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

	test("target electron-main", { target: "electron-main" }, (e) =>
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
		-         "exportsOnly": false,
		+         "exportsOnly": true,
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

	test("target electron-main", { target: "electron-preload" }, (e) =>
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
		-         "exportsOnly": false,
		+         "exportsOnly": true,
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

	test(
		"target node and web (universal)",
		{
			target: ["web", "node"],
			output: { module: true },
			experiments: { outputModule: true }
		},
		(e) =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-     "outputModule": false,
			+     "outputModule": true,
			@@ ... @@
			-     "node": false,
			+     "node": true,
			@@ ... @@
			-   "externalsType": "var",
			+   "externalsType": "module-import",
			@@ ... @@
			-       "document": true,
			-       "dynamicImport": undefined,
			-       "dynamicImportInWorker": undefined,
			+       "document": false,
			+       "dynamicImport": true,
			+       "dynamicImportInWorker": true,
			@@ ... @@
			-       "module": undefined,
			+       "module": true,
			@@ ... @@
			-     "target": "web",
			+     "target": undefined,
			@@ ... @@
			-         "importMeta": true,
			+         "importMeta": "preserve-unknown",
			@@ ... @@
			-     "__dirname": "mock",
			-     "__filename": "mock",
			+     "__dirname": "eval-only",
			+     "__filename": "eval-only",
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
			-       "fetch",
			+       "universal",
			@@ ... @@
			-       "document": true,
			-       "dynamicImport": undefined,
			-       "dynamicImportInWorker": undefined,
			+       "document": false,
			+       "dynamicImport": true,
			+       "dynamicImportInWorker": true,
			@@ ... @@
			-       "module": undefined,
			+       "module": true,
			@@ ... @@
			-     "filename": "[name].js",
			-     "globalObject": "self",
			+     "filename": "[name].mjs",
			+     "globalObject": "globalThis",
			@@ ... @@
			-     "hotUpdateChunkFilename": "[id].[fullhash].hot-update.js",
			+     "hotUpdateChunkFilename": "[id].[fullhash].hot-update.mjs",
			@@ ... @@
			-     "hotUpdateMainFilename": "[runtime].[fullhash].hot-update.json",
			+     "hotUpdateMainFilename": "[runtime].[fullhash].hot-update.json.mjs",
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
			-     "wasmLoading": "fetch",
			+     "wasmLoading": "universal",
			@@ ... @@
			-     "workerChunkFilename": "[name].js",
			-     "workerChunkLoading": "import-scripts",
			+     "workerChunkFilename": "[name].mjs",
			+     "workerChunkLoading": "import",
			@@ ... @@
			-     "workerWasmLoading": "fetch",
			+     "workerWasmLoading": "universal",
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
			@@ ... @@
			-   "target": "web",
			+   "target": Array [
			+     "web",
			+     "node",
			+   ],
		`)
	);

	test(
		"target universal (preset)",
		{
			// the universal preset enables ESM output (and web worker support) on its own
			target: "universal"
		},
		(e) =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-     "outputModule": false,
			+     "outputModule": true,
			@@ ... @@
			-     "electron": false,
			-     "electronMain": false,
			-     "electronPreload": false,
			-     "electronRenderer": false,
			-     "node": false,
			-     "nwjs": false,
			+     "electron": true,
			+     "electronMain": null,
			+     "electronPreload": null,
			+     "electronRenderer": null,
			+     "node": true,
			+     "nwjs": true,
			@@ ... @@
			-   "externalsType": "var",
			+   "externalsType": "module-import",
			@@ ... @@
			-       "document": true,
			-       "dynamicImport": undefined,
			-       "dynamicImportInWorker": undefined,
			+       "document": false,
			+       "dynamicImport": true,
			+       "dynamicImportInWorker": true,
			@@ ... @@
			-       "module": undefined,
			+       "module": true,
			@@ ... @@
			-     "target": "web",
			+     "target": undefined,
			@@ ... @@
			-         "importMeta": true,
			+         "importMeta": "preserve-unknown",
			@@ ... @@
			-     "__dirname": "mock",
			-     "__filename": "mock",
			+     "__dirname": "eval-only",
			+     "__filename": "eval-only",
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
			-       "fetch",
			+       "universal",
			@@ ... @@
			-       "document": true,
			-       "dynamicImport": undefined,
			-       "dynamicImportInWorker": undefined,
			+       "document": false,
			+       "dynamicImport": true,
			+       "dynamicImportInWorker": true,
			@@ ... @@
			-       "module": undefined,
			+       "module": true,
			@@ ... @@
			-     "filename": "[name].js",
			-     "globalObject": "self",
			+     "filename": "[name].mjs",
			+     "globalObject": "globalThis",
			@@ ... @@
			-     "hotUpdateChunkFilename": "[id].[fullhash].hot-update.js",
			+     "hotUpdateChunkFilename": "[id].[fullhash].hot-update.mjs",
			@@ ... @@
			-     "hotUpdateMainFilename": "[runtime].[fullhash].hot-update.json",
			+     "hotUpdateMainFilename": "[runtime].[fullhash].hot-update.json.mjs",
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
			-     "wasmLoading": "fetch",
			+     "wasmLoading": "universal",
			@@ ... @@
			-     "workerChunkFilename": "[name].js",
			-     "workerChunkLoading": "import-scripts",
			+     "workerChunkFilename": "[name].mjs",
			+     "workerChunkLoading": "import",
			@@ ... @@
			-     "workerWasmLoading": "fetch",
			+     "workerWasmLoading": "universal",
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
			@@ ... @@
			-   "target": "web",
			+   "target": "universal",
		`)
	);

	test(
		"universal target with a version lacking globalThis",
		{
			// node<12 lacks `globalThis`: globalObject stays `self`, environment.globalThis false
			target: ["web", "node10"],
			experiments: { outputModule: false },
			output: { chunkFormat: "array-push" }
		},
		(e) =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-     "web": true,
			+     "web": false,
			@@ ... @@
			-       "bigIntLiteral": true,
			+       "bigIntLiteral": false,
			@@ ... @@
			-       "document": true,
			-       "dynamicImport": undefined,
			-       "dynamicImportInWorker": undefined,
			+       "document": false,
			+       "dynamicImport": false,
			+       "dynamicImportInWorker": false,
			@@ ... @@
			-       "globalThis": undefined,
			-       "hasOwn": undefined,
			-       "importMetaDirnameAndFilename": undefined,
			+       "globalThis": false,
			+       "hasOwn": false,
			+       "importMetaDirnameAndFilename": false,
			@@ ... @@
			-       "logicalAssignment": undefined,
			+       "logicalAssignment": false,
			@@ ... @@
			-       "module": undefined,
			+       "module": false,
			@@ ... @@
			-       "nodeBuiltinModuleGetter": undefined,
			-       "nodePrefixForCoreModules": true,
			-       "optionalChaining": true,
			+       "nodeBuiltinModuleGetter": false,
			+       "nodePrefixForCoreModules": false,
			+       "optionalChaining": false,
			@@ ... @@
			-     "target": "web",
			+     "target": undefined,
			@@ ... @@
			-     "chunkLoading": "jsonp",
			+     "chunkLoading": false,
			@@ ... @@
			-     "enabledChunkLoadingTypes": Array [
			-       "jsonp",
			-       "import-scripts",
			-     ],
			+     "enabledChunkLoadingTypes": Array [],
			@@ ... @@
			-     "enabledWasmLoadingTypes": Array [
			-       "fetch",
			-     ],
			+     "enabledWasmLoadingTypes": Array [],
			@@ ... @@
			-       "bigIntLiteral": true,
			+       "bigIntLiteral": false,
			@@ ... @@
			-       "document": true,
			-       "dynamicImport": undefined,
			-       "dynamicImportInWorker": undefined,
			+       "document": false,
			+       "dynamicImport": false,
			+       "dynamicImportInWorker": false,
			@@ ... @@
			-       "globalThis": undefined,
			-       "hasOwn": undefined,
			-       "importMetaDirnameAndFilename": undefined,
			+       "globalThis": false,
			+       "hasOwn": false,
			+       "importMetaDirnameAndFilename": false,
			@@ ... @@
			-       "logicalAssignment": undefined,
			+       "logicalAssignment": false,
			@@ ... @@
			-       "module": undefined,
			+       "module": false,
			@@ ... @@
			-       "nodeBuiltinModuleGetter": undefined,
			-       "nodePrefixForCoreModules": true,
			-       "optionalChaining": true,
			+       "nodeBuiltinModuleGetter": false,
			+       "nodePrefixForCoreModules": false,
			+       "optionalChaining": false,
			@@ ... @@
			-     "publicPath": "auto",
			+     "publicPath": "",
			@@ ... @@
			-     "wasmLoading": "fetch",
			+     "wasmLoading": false,
			@@ ... @@
			-     "workerChunkLoading": "import-scripts",
			+     "workerChunkLoading": false,
			@@ ... @@
			-     "workerWasmLoading": "fetch",
			+     "workerWasmLoading": false,
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
			@@ ... @@
			-   "target": "web",
			+   "target": Array [
			+     "web",
			+     "node10",
			+   ],
		`)
	);

	test(
		"universal target with mixed globalThis support",
		{
			// node10 lacks `globalThis` while node12 has it: the merged value is `null`,
			// so globalObject stays `self` (not every selected target supports globalThis)
			target: ["web", "node10", "node12"],
			experiments: { outputModule: false },
			output: { chunkFormat: "array-push" }
		},
		(e) =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-     "web": true,
			+     "web": false,
			@@ ... @@
			-       "bigIntLiteral": true,
			+       "bigIntLiteral": false,
			@@ ... @@
			-       "document": true,
			-       "dynamicImport": undefined,
			-       "dynamicImportInWorker": undefined,
			+       "document": false,
			+       "dynamicImport": false,
			+       "dynamicImportInWorker": false,
			@@ ... @@
			-       "globalThis": undefined,
			-       "hasOwn": undefined,
			-       "importMetaDirnameAndFilename": undefined,
			+       "globalThis": null,
			+       "hasOwn": false,
			+       "importMetaDirnameAndFilename": false,
			@@ ... @@
			-       "logicalAssignment": undefined,
			+       "logicalAssignment": false,
			@@ ... @@
			-       "module": undefined,
			+       "module": false,
			@@ ... @@
			-       "nodeBuiltinModuleGetter": undefined,
			-       "nodePrefixForCoreModules": true,
			-       "optionalChaining": true,
			+       "nodeBuiltinModuleGetter": false,
			+       "nodePrefixForCoreModules": false,
			+       "optionalChaining": false,
			@@ ... @@
			-     "target": "web",
			+     "target": undefined,
			@@ ... @@
			-     "chunkLoading": "jsonp",
			+     "chunkLoading": false,
			@@ ... @@
			-     "enabledChunkLoadingTypes": Array [
			-       "jsonp",
			-       "import-scripts",
			-     ],
			+     "enabledChunkLoadingTypes": Array [],
			@@ ... @@
			-     "enabledWasmLoadingTypes": Array [
			-       "fetch",
			-     ],
			+     "enabledWasmLoadingTypes": Array [],
			@@ ... @@
			-       "bigIntLiteral": true,
			+       "bigIntLiteral": false,
			@@ ... @@
			-       "document": true,
			-       "dynamicImport": undefined,
			-       "dynamicImportInWorker": undefined,
			+       "document": false,
			+       "dynamicImport": false,
			+       "dynamicImportInWorker": false,
			@@ ... @@
			-       "globalThis": undefined,
			-       "hasOwn": undefined,
			-       "importMetaDirnameAndFilename": undefined,
			+       "globalThis": null,
			+       "hasOwn": false,
			+       "importMetaDirnameAndFilename": false,
			@@ ... @@
			-       "logicalAssignment": undefined,
			+       "logicalAssignment": false,
			@@ ... @@
			-       "module": undefined,
			+       "module": false,
			@@ ... @@
			-       "nodeBuiltinModuleGetter": undefined,
			-       "nodePrefixForCoreModules": true,
			-       "optionalChaining": true,
			+       "nodeBuiltinModuleGetter": false,
			+       "nodePrefixForCoreModules": false,
			+       "optionalChaining": false,
			@@ ... @@
			-     "publicPath": "auto",
			+     "publicPath": "",
			@@ ... @@
			-     "wasmLoading": "fetch",
			+     "wasmLoading": false,
			@@ ... @@
			-     "workerChunkLoading": "import-scripts",
			+     "workerChunkLoading": false,
			@@ ... @@
			-     "workerWasmLoading": "fetch",
			+     "workerWasmLoading": false,
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
			@@ ... @@
			-   "target": "web",
			+   "target": Array [
			+     "web",
			+     "node10",
			+     "node12",
			+   ],
		`)
	);

	test("records", { recordsPath: "some-path" }, (e) =>
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

	test(
		"ecmaVersion",
		{ output: /** @type {EXPECTED_ANY} */ ({ ecmaVersion: 2020 }) },
		(e) => e.toMatchInlineSnapshot("Compared values have no visual difference.")
	);

	test(
		"single runtimeChunk",
		{ optimization: { runtimeChunk: "single" } },
		(e) =>
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
		(e) =>
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

	test("single runtimeChunk", { optimization: { runtimeChunk: true } }, (e) =>
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

	test("cache true", { cache: true }, (e) =>
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

	test("cache filesystem", { cache: { type: "filesystem" } }, (e) =>
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
		(e) =>
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
			+   "devtool": Array [
			+     Object {
			+       "type": "css",
			+       "use": "source-map",
			+     },
			+     Object {
			+       "type": "javascript",
			+       "use": "eval",
			+     },
			+   ],
			@@ ... @@
			-   "mode": "none",
			+   "mode": "development",
			@@ ... @@
			-         "localIdentName": "[fullhash]",
			+         "localIdentName": "[uniqueName]-[id]-[local]",
			@@ ... @@
			-         "localIdentName": "[fullhash]",
			+         "localIdentName": "[uniqueName]-[id]-[local]",
			@@ ... @@
			-         "localIdentName": "[fullhash]",
			+         "localIdentName": "[uniqueName]-[id]-[local]",
			@@ ... @@
			-         "exportsDepth": Infinity,
			+         "exportsDepth": 1,
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
			-     "pathinfo": false,
			+     "pathinfo": true,
			@@ ... @@
			-     "strictModuleResolution": false,
			+     "strictModuleResolution": true,
			@@ ... @@
			-           "production",
			+           "development",
			@@ ... @@
			-           "production",
			+           "development",
			@@ ... @@
			-           "production",
			+           "development",
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
		"cache filesystem and futureDefaults",
		{ cache: { type: "filesystem" }, experiments: { futureDefaults: true } },
		(e) =>
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
			+     "hashAlgorithm": "xxhash64",
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
			-     "backCompat": true,
			+     "backCompat": false,
			@@ ... @@
			-     "cacheUnaffected": false,
			+     "cacheUnaffected": true,
			@@ ... @@
			-     "futureDefaults": false,
			+     "futureDefaults": true,
			@@ ... @@
			-     "progress": false,
			+     "progress": "auto",
			@@ ... @@
			+       },
			+       Object {
			+         "oneOf": Array [
			+           Object {
			+             "resourceQuery": /(\\?|&)raw(&|$)/,
			+             "type": "asset/source",
			+           },
			+           Object {
			+             "resourceQuery": /(\\?|&)url(&|$)/,
			+             "type": "asset/resource",
			+           },
			+           Object {
			+             "resourceQuery": /(\\?|&)no-inline(&|$)/,
			+             "type": "asset/resource",
			+           },
			+           Object {
			+             "resourceQuery": /(\\?|&)inline(&|$)/,
			+             "type": "asset/inline",
			@@ ... @@
			+       },
			+     ],
			@@ ... @@
			-         "localIdentHashFunction": "md4",
			+         "localIdentHashFunction": "xxhash64",
			@@ ... @@
			-         "localIdentHashFunction": "md4",
			+         "localIdentHashFunction": "xxhash64",
			@@ ... @@
			-         "localIdentHashFunction": "md4",
			+         "localIdentHashFunction": "xxhash64",
			@@ ... @@
			+         "exportsPresence": "error",
			@@ ... @@
			-         "strictModeViolations": "warn",
			+         "strictModeViolations": "error",
			@@ ... @@
			-     "unsafeCache": false,
			+     "unsafeCache": [Function anonymous],
			@@ ... @@
			-     "__dirname": "mock",
			-     "__filename": "mock",
			-     "global": true,
			+     "__dirname": "warn-mock",
			+     "__filename": "warn-mock",
			+     "global": "warn",
			@@ ... @@
			-     "charset": true,
			+     "charset": false,
			@@ ... @@
			-     "hashDigestLength": 20,
			-     "hashFunction": "md4",
			+     "hashDigestLength": 16,
			+     "hashFunction": "xxhash64",
			@@ ... @@
			+           ".html",
			@@ ... @@
			-           ".html",
			@@ ... @@
			+           ".html",
			@@ ... @@
			-           ".html",
			@@ ... @@
			+           ".html",
			@@ ... @@
			-           ".html",
			@@ ... @@
			+           ".html",
			@@ ... @@
			-           ".html",
			@@ ... @@
			-     "cache": false,
			+     "cache": true,
			@@ ... @@
			-     "cache": false,
			+     "cache": true,
			@@ ... @@
			-       "<cwd>/node_modules/",
			+       /^(.+?[\\\\/]node_modules[\\\\/])/,
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
		(e) =>
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
			-         "css",
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
		(e) =>
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

	test("stats true", { stats: true }, (e) =>
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

	test("stats false", { stats: false }, (e) =>
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

	test("stats string", { stats: "minimal" }, (e) =>
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
		(e) =>
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
			-       "generator": true,
			-       "globalThis": undefined,
			-       "hasOwn": undefined,
			-       "importMetaDirnameAndFilename": undefined,
			-       "let": true,
			-       "logicalAssignment": undefined,
			-       "methodShorthand": true,
			-       "module": undefined,
			-       "modulePreload": true,
			-       "nodeBuiltinModuleGetter": undefined,
			-       "nodePrefixForCoreModules": true,
			-       "optionalChaining": true,
			-       "spread": true,
			-       "symbol": true,
			-       "templateLiteral": true,
			+       "dynamicImport": false,
			+       "dynamicImportInWorker": false,
			+       "forOf": false,
			+       "generator": false,
			+       "globalThis": false,
			+       "hasOwn": false,
			+       "importMetaDirnameAndFilename": false,
			+       "let": false,
			+       "logicalAssignment": false,
			+       "methodShorthand": false,
			+       "module": false,
			+       "modulePreload": false,
			+       "nodeBuiltinModuleGetter": false,
			+       "nodePrefixForCoreModules": false,
			+       "optionalChaining": false,
			+       "spread": false,
			+       "symbol": false,
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
			-       "generator": true,
			-       "globalThis": undefined,
			-       "hasOwn": undefined,
			-       "importMetaDirnameAndFilename": undefined,
			-       "let": true,
			-       "logicalAssignment": undefined,
			-       "methodShorthand": true,
			-       "module": undefined,
			-       "modulePreload": true,
			-       "nodeBuiltinModuleGetter": undefined,
			-       "nodePrefixForCoreModules": true,
			-       "optionalChaining": true,
			-       "spread": true,
			-       "symbol": true,
			-       "templateLiteral": true,
			+       "dynamicImport": false,
			+       "dynamicImportInWorker": false,
			+       "forOf": false,
			+       "generator": false,
			+       "globalThis": false,
			+       "hasOwn": false,
			+       "importMetaDirnameAndFilename": false,
			+       "let": false,
			+       "logicalAssignment": false,
			+       "methodShorthand": false,
			+       "module": false,
			+       "modulePreload": false,
			+       "nodeBuiltinModuleGetter": false,
			+       "nodePrefixForCoreModules": false,
			+       "optionalChaining": false,
			+       "spread": false,
			+       "symbol": false,
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
		(e) =>
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
		(e) =>
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
		(e) =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-     "backCompat": true,
			+     "backCompat": false,
			@@ ... @@
			-     "cacheUnaffected": false,
			+     "cacheUnaffected": true,
			@@ ... @@
			-     "futureDefaults": false,
			+     "futureDefaults": true,
			@@ ... @@
			-     "progress": false,
			+     "progress": "auto",
			@@ ... @@
			+       },
			+       Object {
			+         "oneOf": Array [
			+           Object {
			+             "resourceQuery": /(\\?|&)raw(&|$)/,
			+             "type": "asset/source",
			@@ ... @@
			+           Object {
			+             "resourceQuery": /(\\?|&)url(&|$)/,
			+             "type": "asset/resource",
			+           },
			+           Object {
			+             "resourceQuery": /(\\?|&)no-inline(&|$)/,
			+             "type": "asset/resource",
			+           },
			+           Object {
			+             "resourceQuery": /(\\?|&)inline(&|$)/,
			+             "type": "asset/inline",
			+           },
			+         ],
			+       },
			@@ ... @@
			-         "localIdentHashFunction": "md4",
			+         "localIdentHashFunction": "xxhash64",
			@@ ... @@
			-         "localIdentHashFunction": "md4",
			+         "localIdentHashFunction": "xxhash64",
			@@ ... @@
			-         "localIdentHashFunction": "md4",
			+         "localIdentHashFunction": "xxhash64",
			@@ ... @@
			+         "exportsPresence": "error",
			@@ ... @@
			-         "strictModeViolations": "warn",
			+         "strictModeViolations": "error",
			@@ ... @@
			-     "__dirname": "mock",
			-     "__filename": "mock",
			-     "global": true,
			+     "__dirname": "warn-mock",
			+     "__filename": "warn-mock",
			+     "global": "warn",
			@@ ... @@
			-     "charset": true,
			+     "charset": false,
			@@ ... @@
			-     "hashDigestLength": 20,
			-     "hashFunction": "md4",
			+     "hashDigestLength": 16,
			+     "hashFunction": "xxhash64",
			@@ ... @@
			+           ".html",
			@@ ... @@
			-           ".html",
			@@ ... @@
			+           ".html",
			@@ ... @@
			-           ".html",
			@@ ... @@
			+           ".html",
			@@ ... @@
			-           ".html",
			@@ ... @@
			+           ".html",
			@@ ... @@
			-           ".html",
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
		(e) =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-     "backCompat": true,
			+     "backCompat": false,
			@@ ... @@
			-     "cacheUnaffected": false,
			-     "css": true,
			+     "cacheUnaffected": true,
			+     "css": false,
			@@ ... @@
			-     "futureDefaults": false,
			+     "futureDefaults": true,
			@@ ... @@
			-     "progress": false,
			+     "progress": "auto",
			@@ ... @@
			-       },
			-       Object {
			-         "resolve": Object {
			-           "fullySpecified": true,
			-           "preferRelative": true,
			-         },
			-         "test": /\\.css$/i,
			-         "type": "css/auto",
			-       },
			-       Object {
			-         "mimetype": "text/css+module",
			-         "resolve": Object {
			-           "fullySpecified": true,
			-           "preferRelative": true,
			-         },
			-         "type": "css/module",
			-       },
			-       Object {
			-         "mimetype": "text/css",
			-         "resolve": Object {
			-           "fullySpecified": true,
			-           "preferRelative": true,
			-         },
			-         "type": "css",
			-       },
			-       Object {
			-         "dependency": /css-import-local-module/,
			-         "exclude": /\\.module\\.\\w+$/i,
			-         "resolve": Object {
			-           "fullySpecified": true,
			-           "preferRelative": true,
			-         },
			-         "type": "css/module",
			-       },
			-       Object {
			-         "dependency": /css-import-global-module/,
			-         "exclude": /\\.module\\.\\w+$/i,
			-         "resolve": Object {
			-           "fullySpecified": true,
			-           "preferRelative": true,
			-         },
			-         "type": "css/global",
			-       },
			-       Object {
			-         "parser": Object {
			-           "exportType": "css-style-sheet",
			-         },
			-         "resolve": Object {
			-           "fullySpecified": true,
			-           "preferRelative": true,
			-         },
			-         "with": Object {
			-           "type": "css",
			-         },
			-       },
			-       Object {
			-         "assert": Object {
			-           "type": "css",
			@@ ... @@
			-         "parser": Object {
			-           "exportType": "css-style-sheet",
			-         },
			-         "resolve": Object {
			-           "fullySpecified": true,
			-           "preferRelative": true,
			-         },
			-       },
			@@ ... @@
			-         "dependency": "html-style",
			-         "parser": Object {
			-           "exportType": "text",
			-         },
			@@ ... @@
			-           "fullySpecified": true,
			-           "preferRelative": true,
			-         },
			-       },
			-       Object {
			-         "dependency": "html-style-attribute",
			-         "parser": Object {
			-           "as": "block-contents",
			-           "exportType": "text",
			-         },
			-         "resolve": Object {
			-           "fullySpecified": true,
			-           "preferRelative": true,
			-         },
			-       },
			-       Object {
			-         "resolve": Object {
			@@ ... @@
			-     ],
			-     "generator": Object {
			-       "css": Object {
			-         "esModule": true,
			-         "exportsOnly": false,
			+       Object {
			+         "oneOf": Array [
			+           Object {
			+             "resourceQuery": /(\\?|&)raw(&|$)/,
			+             "type": "asset/source",
			@@ ... @@
			-       "css/auto": Object {
			-         "exportsConvention": "as-is",
			-         "localIdentHashDigest": "base64url",
			-         "localIdentHashDigestLength": 6,
			-         "localIdentHashFunction": "md4",
			-         "localIdentHashSalt": undefined,
			-         "localIdentName": "[fullhash]",
			+           Object {
			+             "resourceQuery": /(\\?|&)url(&|$)/,
			+             "type": "asset/resource",
			@@ ... @@
			-       "css/global": Object {
			-         "exportsConvention": "as-is",
			-         "localIdentHashDigest": "base64url",
			-         "localIdentHashDigestLength": 6,
			-         "localIdentHashFunction": "md4",
			-         "localIdentHashSalt": undefined,
			-         "localIdentName": "[fullhash]",
			+           Object {
			+             "resourceQuery": /(\\?|&)no-inline(&|$)/,
			+             "type": "asset/resource",
			+           },
			+           Object {
			+             "resourceQuery": /(\\?|&)inline(&|$)/,
			+             "type": "asset/inline",
			@@ ... @@
			-       "css/module": Object {
			-         "exportsConvention": "as-is",
			-         "localIdentHashDigest": "base64url",
			-         "localIdentHashDigestLength": 6,
			-         "localIdentHashFunction": "md4",
			-         "localIdentHashSalt": undefined,
			-         "localIdentName": "[fullhash]",
			+         ],
			@@ ... @@
			+     ],
			+     "generator": Object {
			@@ ... @@
			-       "css": Object {
			-         "customMedia": true,
			-         "customSelectors": true,
			-         "import": true,
			-         "namedExports": true,
			-         "url": true,
			-       },
			-       "css/auto": Object {
			-         "animation": true,
			-         "container": true,
			-         "customIdents": true,
			-         "customMedia": true,
			-         "customSelectors": true,
			-         "dashedIdents": true,
			-         "function": true,
			-         "grid": true,
			-       },
			-       "css/global": Object {
			-         "animation": true,
			-         "container": true,
			-         "customIdents": true,
			-         "customMedia": true,
			-         "customSelectors": true,
			-         "dashedIdents": true,
			-         "function": true,
			-         "grid": true,
			-       },
			-       "css/module": Object {
			-         "animation": true,
			-         "container": true,
			-         "customIdents": true,
			-         "customMedia": true,
			-         "customSelectors": true,
			-         "dashedIdents": true,
			-         "function": true,
			-         "grid": true,
			-       },
			@@ ... @@
			+         "exportsPresence": "error",
			@@ ... @@
			-         "strictModeViolations": "warn",
			+         "strictModeViolations": "error",
			@@ ... @@
			-     "__dirname": "mock",
			-     "__filename": "mock",
			-     "global": true,
			+     "__dirname": "warn-mock",
			+     "__filename": "warn-mock",
			+     "global": "warn",
			@@ ... @@
			-         "css",
			@@ ... @@
			-     "charset": true,
			+     "charset": false,
			@@ ... @@
			-     "hashDigestLength": 20,
			-     "hashFunction": "md4",
			+     "hashDigestLength": 16,
			+     "hashFunction": "xxhash64",
			@@ ... @@
			-       "css-import": Object {
			-         "conditionNames": Array [
			-           "webpack",
			-           "production",
			-           "style",
			-         ],
			-         "extensions": Array [
			-           ".css",
			-         ],
			-         "mainFields": Array [
			-           "style",
			-           "...",
			-         ],
			-         "mainFiles": Array [],
			-         "preferRelative": true,
			-       },
			-       "css-import-global-module": Object {
			-         "conditionNames": Array [
			-           "webpack",
			-           "production",
			-           "style",
			-         ],
			-         "extensions": Array [
			-           ".css",
			-         ],
			-         "mainFields": Array [
			-           "style",
			-           "...",
			-         ],
			-         "mainFiles": Array [],
			-         "preferRelative": true,
			-       },
			-       "css-import-local-module": Object {
			-         "conditionNames": Array [
			-           "webpack",
			-           "production",
			-           "style",
			-         ],
			-         "extensions": Array [
			-           ".css",
			-         ],
			-         "mainFields": Array [
			-           "style",
			-           "...",
			-         ],
			-         "mainFiles": Array [],
			-         "preferRelative": true,
			-       },
			@@ ... @@
			+           ".html",
			@@ ... @@
			-           ".html",
			-           ".css",
			@@ ... @@
			+           ".html",
			@@ ... @@
			-           ".html",
			-           ".css",
			@@ ... @@
			+           ".html",
			@@ ... @@
			-           ".html",
			-           ".css",
			@@ ... @@
			+           ".html",
			@@ ... @@
			-           ".html",
			-           ".css",
			@@ ... @@
			-       "<cwd>/node_modules/",
			+       /^(.+?[\\\\/]node_modules[\\\\/])/,
		`)
	);

	test(
		"target node with ESM output",
		{ target: "node14", experiments: { outputModule: true } },
		(e) =>
			e.toMatchInlineSnapshot(`
			- Expected
			+ Received

			@@ ... @@
			-     "outputModule": false,
			+     "outputModule": true,
			@@ ... @@
			-     "node": false,
			+     "node": true,
			@@ ... @@
			-     "web": true,
			+     "web": false,
			@@ ... @@
			-   "externalsType": "var",
			+   "externalsType": "module-import",
			@@ ... @@
			-       "document": true,
			-       "dynamicImport": undefined,
			-       "dynamicImportInWorker": undefined,
			+       "document": false,
			+       "dynamicImport": true,
			+       "dynamicImportInWorker": true,
			@@ ... @@
			-       "globalThis": undefined,
			-       "hasOwn": undefined,
			-       "importMetaDirnameAndFilename": undefined,
			+       "globalThis": true,
			+       "hasOwn": false,
			+       "importMetaDirnameAndFilename": false,
			@@ ... @@
			-       "logicalAssignment": undefined,
			+       "logicalAssignment": false,
			@@ ... @@
			-       "module": undefined,
			+       "module": true,
			@@ ... @@
			-       "nodeBuiltinModuleGetter": undefined,
			-       "nodePrefixForCoreModules": true,
			+       "nodeBuiltinModuleGetter": false,
			+       "nodePrefixForCoreModules": false,
			@@ ... @@
			-     "target": "web",
			+     "target": "node",
			@@ ... @@
			-         "exportsOnly": false,
			+         "exportsOnly": true,
			@@ ... @@
			-         "createRequire": false,
			+         "createRequire": true,
			@@ ... @@
			-         "importMeta": true,
			+         "importMeta": "preserve-unknown",
			@@ ... @@
			-     "__dirname": "mock",
			-     "__filename": "mock",
			-     "global": true,
			+     "__dirname": "eval-only",
			+     "__filename": "eval-only",
			+     "global": false,
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
			-       "fetch",
			+       "async-node",
			@@ ... @@
			-       "document": true,
			-       "dynamicImport": undefined,
			-       "dynamicImportInWorker": undefined,
			+       "document": false,
			+       "dynamicImport": true,
			+       "dynamicImportInWorker": true,
			@@ ... @@
			-       "globalThis": undefined,
			-       "hasOwn": undefined,
			-       "importMetaDirnameAndFilename": undefined,
			+       "globalThis": true,
			+       "hasOwn": false,
			+       "importMetaDirnameAndFilename": false,
			@@ ... @@
			-       "logicalAssignment": undefined,
			+       "logicalAssignment": false,
			@@ ... @@
			-       "module": undefined,
			+       "module": true,
			@@ ... @@
			-       "nodeBuiltinModuleGetter": undefined,
			-       "nodePrefixForCoreModules": true,
			+       "nodeBuiltinModuleGetter": false,
			+       "nodePrefixForCoreModules": false,
			@@ ... @@
			-     "filename": "[name].js",
			-     "globalObject": "self",
			+     "filename": "[name].mjs",
			+     "globalObject": "global",
			@@ ... @@
			-     "hotUpdateChunkFilename": "[id].[fullhash].hot-update.js",
			+     "hotUpdateChunkFilename": "[id].[fullhash].hot-update.mjs",
			@@ ... @@
			-     "hotUpdateMainFilename": "[runtime].[fullhash].hot-update.json",
			+     "hotUpdateMainFilename": "[runtime].[fullhash].hot-update.json.mjs",
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
			-     "wasmLoading": "fetch",
			+     "wasmLoading": "async-node",
			@@ ... @@
			-     "workerChunkFilename": "[name].js",
			-     "workerChunkLoading": "import-scripts",
			+     "workerChunkFilename": "[name].mjs",
			+     "workerChunkLoading": "import",
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
			+   "target": "node14",
		`)
	);
});

describe("experiments.css/html/asyncWebAssembly auto", () => {
	/**
	 * @param {Configuration} config configuration
	 * @returns {{ css: unknown, html: unknown, asyncWebAssembly: unknown }} resolved experiments
	 */
	const resolve = (config) => {
		const { experiments } = getDefaultConfig(config);
		return {
			css: experiments.css,
			html: experiments.html,
			asyncWebAssembly: experiments.asyncWebAssembly
		};
	};

	it("enables the built-in css/html/wasm support by default (no loaders)", () => {
		expect(resolve({})).toEqual({
			css: true,
			html: true,
			asyncWebAssembly: true
		});
	});

	it("keeps css off when a loader is registered for .css files", () => {
		expect(
			resolve({ module: { rules: [{ test: /\.css$/i, use: ["css-loader"] }] } })
		).toEqual({ css: false, html: true, asyncWebAssembly: true });
	});

	it("keeps css off when a loader also covers .module.css", () => {
		expect(
			resolve({
				module: { rules: [{ test: /\.module\.css$/i, use: ["css-loader"] }] }
			})
		).toEqual({ css: false, html: true, asyncWebAssembly: true });
	});

	it("keeps html off when a loader is registered for .html files", () => {
		expect(
			resolve({
				module: { rules: [{ test: /\.html$/i, loader: "html-loader" }] }
			})
		).toEqual({ css: true, html: false, asyncWebAssembly: true });
	});

	it("keeps async wasm off when a loader is registered for .wasm files", () => {
		expect(
			resolve({
				module: { rules: [{ test: /\.wasm$/i, use: ["wasm-loader"] }] }
			})
		).toEqual({ css: true, html: true, asyncWebAssembly: false });
	});

	it("keeps async wasm off when syncWebAssembly is enabled", () => {
		expect(resolve({ experiments: { syncWebAssembly: true } })).toEqual({
			css: true,
			html: true,
			asyncWebAssembly: false
		});
	});

	it("detects a loader nested in oneOf", () => {
		expect(
			resolve({
				module: {
					rules: [
						{
							test: /\.css$/i,
							oneOf: [
								{ resourceQuery: /raw/, type: "asset/source" },
								{ use: ["css-loader"] }
							]
						}
					]
				}
			})
		).toEqual({ css: false, html: true, asyncWebAssembly: true });
	});

	it("keeps css off for a loader scoped to specific .css filenames", () => {
		// A `test` regexp that references the extension counts even when the generic
		// sample path doesn't match it, so the built-in type doesn't double-process.
		expect(
			resolve({
				module: {
					rules: [
						{ test: /source\.css$/, loader: "css-loader" },
						{ test: /dep\.css$/, loader: "css-loader" }
					]
				}
			})
		).toEqual({ css: false, html: true, asyncWebAssembly: true });
	});

	it("keeps css off for a combined sass/less rule that also covers .css", () => {
		// The common `sass-loader` setup tests `.sass`, `.scss` and `.css` together;
		// the built-in type must stay off so the loader chain keeps handling .css.
		expect(
			resolve({
				module: {
					rules: [
						{
							test: /\.(sa|sc|c)ss$/i,
							use: ["style-loader", "css-loader", "sass-loader"]
						}
					]
				}
			})
		).toEqual({ css: false, html: true, asyncWebAssembly: true });
	});

	it("leaves css on when sass/less loaders only handle .scss/.less", () => {
		// `.scss`/`.less` don't overlap the built-in `/\.css$/i` rule, so enabling
		// css by default is additive here and does not double-process anything.
		expect(
			resolve({
				module: {
					rules: [
						{ test: /\.s[ac]ss$/i, use: ["css-loader", "sass-loader"] },
						{ test: /\.less$/i, use: ["css-loader", "less-loader"] }
					]
				}
			})
		).toEqual({ css: true, html: true, asyncWebAssembly: true });
	});

	it("stays lenient about include/exclude narrowing", () => {
		// A loader scoped to `include: /src/` already handles those files today, so
		// the built-in type must stay off even for a resource outside that scope.
		expect(
			resolve({
				module: {
					rules: [{ test: /\.css$/i, include: /src/, use: ["css-loader"] }]
				}
			})
		).toEqual({ css: false, html: true, asyncWebAssembly: true });
	});

	it("keeps css on when only an enforce:pre loader targets .css", () => {
		// A pre/post loader (e.g. stylelint) doesn't establish the module type, so it
		// must not suppress the built-in css type.
		expect(
			resolve({
				module: {
					rules: [
						{ test: /\.css$/i, enforce: "pre", use: ["stylelint-loader"] }
					]
				}
			})
		).toEqual({ css: true, html: true, asyncWebAssembly: true });
	});

	it("ignores loaders registered for unrelated extensions", () => {
		expect(
			resolve({
				module: { rules: [{ test: /\.js$/i, use: ["babel-loader"] }] }
			})
		).toEqual({ css: true, html: true, asyncWebAssembly: true });
	});

	it("applies the default dev css source map to auto-enabled css", () => {
		// `devtool` is resolved after experiments, so auto-enabled css still gets the
		// default `{ type: "css", use: "source-map" }` dev source map.
		const { devtool } = getDefaultConfig({ mode: "development" });
		expect(devtool).toContainEqual({ type: "css", use: "source-map" });
	});

	it("keeps auto-enabled html below .js in resolve extensions", () => {
		// Auto-enabled html must not let `x.html` shadow `x.js` for `import "./x"`.
		const { resolve: r } = getDefaultConfig({});
		const exts = /** @type {string[]} */ (
			/** @type {EXPECTED_ANY} */ (r.byDependency).esm.extensions
		);
		expect(exts.indexOf(".html")).toBeGreaterThan(exts.indexOf(".js"));
	});

	it("keeps .html above .js when html is explicitly enabled", () => {
		// Explicit opt-in preserves the html-as-entry priority (`.html` before `.js`).
		const { resolve: r } = getDefaultConfig({ experiments: { html: true } });
		const exts = /** @type {string[]} */ (
			/** @type {EXPECTED_ANY} */ (r.byDependency).esm.extensions
		);
		expect(exts.indexOf(".html")).toBeLessThan(exts.indexOf(".js"));
	});

	it("respects explicit boolean values", () => {
		expect(
			resolve({
				experiments: { css: false, html: false, asyncWebAssembly: false }
			})
		).toEqual({ css: false, html: false, asyncWebAssembly: false });
		expect(
			resolve({
				experiments: { css: true, html: true, asyncWebAssembly: true },
				module: { rules: [{ test: /\.css$/i, use: ["css-loader"] }] }
			})
		).toEqual({ css: true, html: true, asyncWebAssembly: true });
	});

	it('resolves an explicit "auto" the same as the default', () => {
		expect(
			resolve({
				experiments: { css: "auto", html: "auto", asyncWebAssembly: "auto" }
			})
		).toEqual({ css: true, html: true, asyncWebAssembly: true });
		expect(
			resolve({
				experiments: { css: "auto" },
				module: { rules: [{ test: /\.css$/i, use: ["css-loader"] }] }
			})
		).toEqual({ css: false, html: true, asyncWebAssembly: true });
	});

	it("keeps futureDefaults forcing the experiments on even with a loader", () => {
		expect(
			resolve({
				experiments: { futureDefaults: true },
				module: {
					rules: [
						{ test: /\.css$/i, use: ["css-loader"] },
						{ test: /\.wasm$/i, use: ["wasm-loader"] }
					]
				}
			})
		).toEqual({ css: true, html: true, asyncWebAssembly: true });
	});
});

describe("experiments.typescript auto", () => {
	/**
	 * @param {Configuration} config configuration
	 * @returns {unknown} resolved experiments.typescript
	 */
	const resolve = (config) => getDefaultConfig(config).experiments.typescript;

	it("enables the built-in typescript support by default (no loaders)", () => {
		expect(resolve({})).toBe(true);
	});

	it("keeps typescript off when a loader is registered for .ts files", () => {
		expect(
			resolve({
				module: { rules: [{ test: /\.tsx?$/i, use: ["ts-loader"] }] }
			})
		).toBe(false);
	});

	it("keeps typescript off when a loader is registered for .mts/.cts files", () => {
		expect(
			resolve({ module: { rules: [{ test: /\.mts$/i, loader: "ts-loader" }] } })
		).toBe(false);
		expect(
			resolve({ module: { rules: [{ test: /\.cts$/i, loader: "ts-loader" }] } })
		).toBe(false);
	});

	it("ignores loaders registered for unrelated extensions", () => {
		expect(
			resolve({
				module: { rules: [{ test: /\.js$/i, use: ["babel-loader"] }] }
			})
		).toBe(true);
	});

	it("keeps typescript off when the Node.js TypeScript API is unavailable", () => {
		// `"auto"` must not enable the built-in support on Node.js < 22.6, where
		// `module.stripTypeScriptTypes` is missing and it would throw at build time.
		const mod = /** @type {EXPECTED_ANY} */ (require("module"));

		const saved = mod.stripTypeScriptTypes;
		mod.stripTypeScriptTypes = undefined;
		try {
			expect(resolve({})).toBe(false);
		} finally {
			mod.stripTypeScriptTypes = saved;
		}
	});

	it("respects explicit boolean values", () => {
		expect(resolve({ experiments: { typescript: false } })).toBe(false);
		expect(
			resolve({
				experiments: { typescript: true },
				module: { rules: [{ test: /\.ts$/i, use: ["ts-loader"] }] }
			})
		).toBe(true);
	});

	it('resolves an explicit "auto" the same as the default', () => {
		expect(resolve({ experiments: { typescript: "auto" } })).toBe(true);
		expect(
			resolve({
				experiments: { typescript: "auto" },
				module: { rules: [{ test: /\.ts$/i, use: ["ts-loader"] }] }
			})
		).toBe(false);
	});

	it("keeps futureDefaults forcing typescript on even with a loader", () => {
		expect(
			resolve({
				experiments: { futureDefaults: true },
				module: { rules: [{ test: /\.ts$/i, use: ["ts-loader"] }] }
			})
		).toBe(true);
	});
});

describe("Targets", () => {
	it("should result in the same target options for same target", () => {
		const inlineTarget = getDefaultConfig({ target: "node12.17" });
		const browserslistTarget = getDefaultConfig({
			target: "browserslist: node 12.17"
		});
		const diff = stripVTControlCharacters(
			/** @type {string} */
			(
				jestDiff(inlineTarget, browserslistTarget, {
					expand: false,
					contextLines: 0
				})
			)
		);

		expect(inlineTarget.output.environment.module).toBe(true);
		expect(inlineTarget.output.environment.dynamicImport).toBe(true);
		expect(new Diff(diff)).toMatchInlineSnapshot(`
		- Expected
		+ Received

		@@ ... @@
		-       "modulePreload": true,
		+       "modulePreload": false,
		@@ ... @@
		-       "modulePreload": true,
		+       "modulePreload": false,
		@@ ... @@
		-   "target": "node12.17",
		+   "target": "browserslist: node 12.17",
	`);
	});
});
