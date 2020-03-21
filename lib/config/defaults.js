/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");
const Template = require("../Template");

/** @typedef {import("../../declarations/WebpackOptions").CacheOptionsNormalized} CacheOptions */
/** @typedef {import("../../declarations/WebpackOptions").Experiments} Experiments */
/** @typedef {import("../../declarations/WebpackOptions").InfrastructureLogging} InfrastructureLogging */
/** @typedef {import("../../declarations/WebpackOptions").Library} Library */
/** @typedef {import("../../declarations/WebpackOptions").LibraryName} LibraryName */
/** @typedef {import("../../declarations/WebpackOptions").LibraryOptions} LibraryOptions */
/** @typedef {import("../../declarations/WebpackOptions").ModuleOptions} ModuleOptions */
/** @typedef {import("../../declarations/WebpackOptions").Node} WebpackNode */
/** @typedef {import("../../declarations/WebpackOptions").Optimization} Optimization */
/** @typedef {import("../../declarations/WebpackOptions").Output} Output */
/** @typedef {import("../../declarations/WebpackOptions").Performance} Performance */
/** @typedef {import("../../declarations/WebpackOptions").ResolveOptions} ResolveOptions */
/** @typedef {import("../../declarations/WebpackOptions").RuleSetRules} RuleSetRules */
/** @typedef {import("../../declarations/WebpackOptions").Target} Target */
/** @typedef {import("../../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */

const NODE_MODULES_REGEXP = /[\\/]node_modules[\\/]/i;

/**
 * Sets a constant default value when undefined
 * @template T
 * @template {keyof T} P
 * @param {T} obj an object
 * @param {P} prop a property of this object
 * @param {T[P]} value a default value of the property
 * @returns {void}
 */
const D = (obj, prop, value) => {
	if (obj[prop] === undefined) {
		obj[prop] = value;
	}
};

/**
 * Sets a dynamic default value when undefined, by calling the factory function
 * @template T
 * @template {keyof T} P
 * @param {T} obj an object
 * @param {P} prop a property of this object
 * @param {function(): T[P]} factory a default value factory for the property
 * @returns {void}
 */
const F = (obj, prop, factory) => {
	if (obj[prop] === undefined) {
		obj[prop] = factory();
	}
};

/**
 * @param {WebpackOptions} options options to be modified
 * @returns {void}
 */
const applyWebpackOptionsBaseDefaults = options => {
	F(options, "context", () => process.cwd());
};

/**
 * @param {WebpackOptions} options options to be modified
 * @returns {void}
 */
const applyWebpackOptionsDefaults = options => {
	F(options, "context", () => process.cwd());
	D(options, "target", "web");

	const { mode, name, target } = options;

	const webTarget =
		target === "web" ||
		target === "webworker" ||
		target === "electron-renderer";
	const development = mode === "development";
	const production = mode === "production" || !mode;

	if (
		typeof options.entry !== "function" &&
		Object.keys(options.entry).length === 0
	) {
		options.entry.main = { import: ["./src"] };
	}

	F(options, "devtool", () => (development ? "eval" : false));
	D(options, "watch", false);
	D(options, "profile", false);
	D(options, "parallelism", 100);
	D(options, "recordsInputPath", false);
	D(options, "recordsOutputPath", false);

	F(options, "cache", () =>
		development ? { type: /** @type {"memory"} */ ("memory") } : false
	);
	applyCacheDefaults(options.cache, {
		name: name || "default",
		mode: mode || "production"
	});
	const cache = !!options.cache;

	applyExperimentsDefaults(options.experiments);

	applyModuleDefaults(options.module, {
		cache,
		mjs: options.experiments.mjs,
		syncWebAssembly: options.experiments.syncWebAssembly,
		asyncWebAssembly: options.experiments.asyncWebAssembly,
		webTarget
	});

	applyOutputDefaults(options.output, {
		context: options.context,
		target,
		outputModule: options.experiments.outputModule,
		development
	});

	if (options.output.library) {
		options.output.enabledLibraryTypes.push(options.output.library.type);
	}
	for (const name of Object.keys(options.entry)) {
		const desc = options.entry[name];
		if (desc.library) {
			options.output.enabledLibraryTypes.push(desc.library.type);
		}
	}

	F(options, "externalsType", () =>
		options.output.library
			? options.output.library.type
			: options.output.module
			? "module"
			: "var"
	);

	applyNodeDefaults(options.node, { target });

	F(options, "performance", () => (production && webTarget ? {} : false));
	applyPerformanceDefaults(options.performance, {
		production
	});

	applyOptimizationDefaults(options.optimization, {
		development,
		production,
		records: !!(options.recordsInputPath || options.recordsOutputPath)
	});

	applyResolveDefaults(options.resolve, {
		cache,
		mjs: options.experiments.mjs,
		webTarget
	});
	applyResolveLoaderDefaults(options.resolveLoader, { cache });

	applyInfrastructureLoggingDefaults(options.infrastructureLogging);
};

/**
 * @param {Experiments} experiments options
 * @returns {void}
 */
const applyExperimentsDefaults = experiments => {
	D(experiments, "asset", false);
	D(experiments, "mjs", false);
	D(experiments, "importAwait", false);
	D(experiments, "importAsync", false);
	D(experiments, "topLevelAwait", false);
	D(experiments, "syncWebAssembly", false);
	D(experiments, "asyncWebAssembly", false);
	D(experiments, "outputModule", false);
};

/**
 * @param {CacheOptions} cache options
 * @param {Object} options options
 * @param {string} options.name name
 * @param {string} options.mode mode
 * @returns {void}
 */
const applyCacheDefaults = (cache, { name, mode }) => {
	if (cache === false) return;
	switch (cache.type) {
		case "filesystem":
			F(cache, "name", () => name + "-" + mode);
			D(cache, "version", "");
			F(cache, "cacheDirectory", () => {
				const pkgDir = require("pkg-dir");
				const cwd = process.cwd();
				const dir = pkgDir.sync(cwd);
				if (!dir) {
					return path.resolve(cwd, ".cache/webpack");
				} else if (process.versions.pnp === "1") {
					return path.resolve(dir, ".pnp/.cache/webpack");
				} else if (process.versions.pnp === "3") {
					return path.resolve(dir, ".yarn/.cache/webpack");
				} else {
					return path.resolve(dir, "node_modules/.cache/webpack");
				}
			});
			F(cache, "cacheLocation", () =>
				path.resolve(cache.cacheDirectory, cache.name)
			);
			D(cache, "hashAlgorithm", "md4");
			D(cache, "store", "pack");
			D(cache, "idleTimeout", 60000);
			D(cache, "idleTimeoutForInitialStore", 0);
			D(cache.buildDependencies, "defaultWebpack", [
				path.resolve(__dirname, "..") + path.sep
			]);
			break;
	}
	F(cache, "managedPaths", () => {
		if (process.versions.pnp === "3") {
			const match = /^(.+?)[\\/]cache[\\/]watchpack-npm-[^\\/]+\.zip[\\/]node_modules[\\/]/.exec(
				require.resolve("watchpack")
			);
			if (match) {
				return [path.resolve(match[1], "unplugged")];
			}
		} else {
			const match = /^(.+?[\\/]node_modules)[\\/]/.exec(
				// eslint-disable-next-line node/no-extraneous-require
				require.resolve("watchpack")
			);
			if (match) {
				return [match[1]];
			}
		}
		return [];
	});
	F(cache, "immutablePaths", () => {
		if (process.versions.pnp === "1") {
			const match = /^(.+?[\\/]v4)[\\/]npm-watchpack-[^\\/]+-[\da-f]{40}[\\/]node_modules[\\/]/.exec(
				require.resolve("watchpack")
			);
			if (match) {
				return [match[1]];
			}
		} else if (process.versions.pnp === "3") {
			const match = /^(.+?)[\\/]watchpack-npm-[^\\/]+\.zip[\\/]node_modules[\\/]/.exec(
				require.resolve("watchpack")
			);
			if (match) {
				return [match[1]];
			}
		}
		return [];
	});
};

/**
 * @param {ModuleOptions} module options
 * @param {Object} options options
 * @param {boolean} options.cache is caching enabled
 * @param {boolean} options.mjs is mjs enabled
 * @param {boolean} options.syncWebAssembly is syncWebAssembly enabled
 * @param {boolean} options.asyncWebAssembly is asyncWebAssembly enabled
 * @param {boolean} options.webTarget is web target
 * @returns {void}
 */
const applyModuleDefaults = (
	module,
	{ cache, mjs, syncWebAssembly, asyncWebAssembly, webTarget }
) => {
	D(module, "unknownContextRequest", ".");
	D(module, "unknownContextRegExp", false);
	D(module, "unknownContextRecursive", true);
	D(module, "unknownContextCritical", true);
	D(module, "exprContextRequest", ".");
	D(module, "exprContextRegExp", false);
	D(module, "exprContextRecursive", true);
	D(module, "exprContextCritical", true);
	D(module, "wrappedContextRegExp", /.*/);
	D(module, "wrappedContextRecursive", true);
	D(module, "wrappedContextCritical", false);

	D(module, "strictExportPresence", false);
	D(module, "strictThisContextOnImports", false);

	if (cache) {
		D(module, "unsafeCache", module => {
			const name = module.nameForCondition();
			return name && NODE_MODULES_REGEXP.test(name);
		});
	} else {
		D(module, "unsafeCache", false);
	}

	F(module, "defaultRules", () => {
		/** @type {RuleSetRules} */
		const rules = [
			{
				type: "javascript/auto",
				resolve: {}
			},
			{
				test: /\.json$/i,
				type: "json"
			}
		];
		if (mjs) {
			rules.push({
				test: /\.mjs$/i,
				type: "javascript/esm",
				resolve: {
					mainFields: webTarget ? ["browser", "main"] : ["main"]
				}
			});
		}
		if (asyncWebAssembly) {
			rules.push({
				test: /\.wasm$/i,
				type: "webassembly/async"
			});
		} else if (syncWebAssembly) {
			rules.push({
				test: /\.wasm$/i,
				type: "webassembly/sync"
			});
		}
		return rules;
	});
};

/**
 * @param {Output} output options
 * @param {Object} options options
 * @param {string} options.context context
 * @param {Target} options.target target
 * @param {boolean} options.outputModule is outputModule experiment enabled
 * @param {boolean} options.development is development mode
 * @returns {void}
 */
const applyOutputDefaults = (
	output,
	{ context, target, outputModule, development }
) => {
	/**
	 * @param {Library=} library the library option
	 * @returns {string} a readable library name
	 */
	const getLibraryName = library => {
		const libraryName =
			typeof library === "object" &&
			library &&
			!Array.isArray(library) &&
			"type" in library
				? library.name
				: /** @type {LibraryName=} */ (library);
		if (Array.isArray(libraryName)) {
			return libraryName.join(".");
		} else if (typeof libraryName === "object") {
			return getLibraryName(libraryName.root);
		} else if (typeof libraryName === "string") {
			return libraryName;
		}
		return "";
	};

	F(output, "uniqueName", () => {
		const libraryName = getLibraryName(output.library);
		if (libraryName) return libraryName;
		try {
			const packageInfo = require(`${context}/package.json`);
			return packageInfo.name || "";
		} catch (e) {
			return "";
		}
	});

	D(output, "filename", "[name].js");
	F(output, "module", () => !!outputModule);
	F(output, "iife", () => !output.module);
	D(output, "ecmaVersion", 6);
	F(output, "chunkFilename", () => {
		const filename = output.filename;
		if (typeof filename !== "function") {
			const hasName = filename.includes("[name]");
			const hasId = filename.includes("[id]");
			const hasChunkHash = filename.includes("[chunkhash]");
			const hasContentHash = filename.includes("[contenthash]");
			// Anything changing depending on chunk is fine
			if (hasChunkHash || hasContentHash || hasName || hasId) return filename;
			// Otherwise prefix "[id]." in front of the basename to make it changing
			return filename.replace(/(^|\/)([^/]*(?:\?|$))/, "$1[id].$2");
		}
		return "[id].js";
	});
	D(output, "assetModuleFilename", "[hash][ext]");
	D(output, "webassemblyModuleFilename", "[hash].module.wasm");
	D(output, "publicPath", "");
	D(output, "compareBeforeEmit", true);
	F(output, "hotUpdateFunction", () =>
		Template.toIdentifier(
			"webpackHotUpdate" + Template.toIdentifier(output.uniqueName)
		)
	);
	F(output, "jsonpFunction", () =>
		Template.toIdentifier(
			"webpackJsonp" + Template.toIdentifier(output.uniqueName)
		)
	);
	F(output, "chunkCallbackName", () =>
		Template.toIdentifier(
			"webpackChunk" + Template.toIdentifier(output.uniqueName)
		)
	);
	F(output, "globalObject", () => {
		switch (target) {
			case "web":
			case "electron-renderer":
			case "node-webkit":
				return "window";
			case "webworker":
				return "self";
			case "node":
			case "async-node":
			case "electron-main":
				return "global";
			default:
				return "self";
		}
	});
	F(output, "devtoolNamespace", () => output.uniqueName);
	F(output, "libraryTarget", () => (output.module ? "module" : "var"));
	F(output, "path", () => path.join(process.cwd(), "dist"));
	F(output, "pathinfo", () => development);
	D(output, "sourceMapFilename", "[file].map[query]");
	D(output, "hotUpdateChunkFilename", "[id].[fullhash].hot-update.js");
	D(output, "hotUpdateMainFilename", "[fullhash].hot-update.json");
	D(output, "crossOriginLoading", false);
	F(output, "jsonpScriptType", () => (output.module ? "module" : false));
	D(output, "chunkLoadTimeout", 120000);
	D(output, "hashFunction", "md4");
	D(output, "hashDigest", "hex");
	D(output, "hashDigestLength", 20);
	D(output, "strictModuleExceptionHandling", false);
};

/**
 * @param {WebpackNode} node options
 * @param {Object} options options
 * @param {Target} options.target target
 * @returns {void}
 */
const applyNodeDefaults = (node, { target }) => {
	if (node === false) return;
	F(node, "global", () => {
		switch (target) {
			case "node":
			case "async-node":
			case "electron-main":
				return false;
			default:
				return true;
		}
	});
	F(node, "__filename", () => {
		switch (target) {
			case "node":
			case "async-node":
			case "electron-main":
				return false;
			default:
				return "mock";
		}
	});
	F(node, "__dirname", () => {
		switch (target) {
			case "node":
			case "async-node":
			case "electron-main":
				return false;
			default:
				return "mock";
		}
	});
};

/**
 * @param {Performance} performance options
 * @param {Object} options options
 * @param {boolean} options.production is production
 * @returns {void}
 */
const applyPerformanceDefaults = (performance, { production }) => {
	if (performance === false) return;
	D(performance, "maxAssetSize", 250000);
	D(performance, "maxEntrypointSize", 250000);
	F(performance, "hints", () => (production ? "warning" : false));
};

/**
 * @param {Optimization} optimization options
 * @param {Object} options options
 * @param {boolean} options.production is production
 * @param {boolean} options.development is development
 * @param {boolean} options.records using records
 * @returns {void}
 */
const applyOptimizationDefaults = (
	optimization,
	{ production, development, records }
) => {
	D(optimization, "removeAvailableModules", false);
	D(optimization, "removeEmptyChunks", true);
	D(optimization, "mergeDuplicateChunks", true);
	D(optimization, "flagIncludedChunks", production);
	F(optimization, "moduleIds", () => {
		if (production) return "deterministic";
		if (development) return "named";
		return "natural";
	});
	F(optimization, "chunkIds", () => {
		if (production) return "deterministic";
		if (development) return "named";
		return "natural";
	});
	D(optimization, "sideEffects", true);
	D(optimization, "providedExports", true);
	D(optimization, "usedExports", true);
	D(optimization, "innerGraph", true);
	D(optimization, "mangleExports", production);
	D(optimization, "concatenateModules", production);
	D(optimization, "runtimeChunk", false);
	D(optimization, "noEmitOnErrors", production);
	D(optimization, "checkWasmTypes", production);
	D(optimization, "mangleWasmImports", false);
	D(optimization, "portableRecords", records);
	D(optimization, "minimize", production);
	F(optimization, "minimizer", () => [
		{
			apply: compiler => {
				// Lazy load the Terser plugin
				const TerserPlugin = require("terser-webpack-plugin");
				new TerserPlugin().apply(compiler);
			}
		}
	]);
	F(optimization, "nodeEnv", () => {
		if (production) return "production";
		if (development) return "development";
		return false;
	});
	const { splitChunks } = optimization;
	if (splitChunks) {
		D(splitChunks, "hidePathInfo", production);
		D(splitChunks, "chunks", "async");
		D(splitChunks, "minChunks", 1);
		F(splitChunks, "minSize", () => (production ? 30000 : 10000));
		F(splitChunks, "minRemainingSize", () => (development ? 0 : undefined));
		F(splitChunks, "maxAsyncRequests", () => (production ? 6 : Infinity));
		F(splitChunks, "maxInitialRequests", () => (production ? 4 : Infinity));
		D(splitChunks, "automaticNameDelimiter", "-");
		const { cacheGroups } = splitChunks;
		F(cacheGroups, "default", () => ({
			idHint: "",
			reuseExistingChunk: true,
			minChunks: 2,
			priority: -20
		}));
		F(cacheGroups, "defaultVendors", () => ({
			idHint: "vendors",
			reuseExistingChunk: true,
			test: NODE_MODULES_REGEXP,
			priority: -10
		}));
	}
};

/**
 * @param {ResolveOptions} resolve options
 * @param {Object} options options
 * @param {boolean} options.cache is cache enable
 * @param {boolean} options.mjs is mjs enabled
 * @param {boolean} options.webTarget is a web-like target
 * @returns {void}
 */
const applyResolveDefaults = (resolve, { cache, mjs, webTarget }) => {
	D(resolve, "cache", cache);
	D(resolve, "modules", ["node_modules"]);
	F(resolve, "extensions", () => {
		const extensions = [];
		if (mjs) extensions.push(".mjs");
		extensions.push(".js", ".json", ".wasm");
		return extensions;
	});
	F(resolve, "mainFiles", () => ["index"]);
	F(resolve, "aliasFields", () => (webTarget ? ["browser"] : []));
	F(resolve, "mainFields", () =>
		webTarget ? ["browser", "module", "main"] : ["module", "main"]
	);
};

/**
 * @param {ResolveOptions} resolve options
 * @param {Object} options options
 * @param {boolean} options.cache is cache enable
 * @returns {void}
 */
const applyResolveLoaderDefaults = (resolve, { cache }) => {
	D(resolve, "cache", cache);
	F(resolve, "mainFields", () => ["loader", "main"]);
	F(resolve, "extensions", () => [".js"]);
	F(resolve, "mainFiles", () => ["index"]);
};

/**
 * @param {InfrastructureLogging} infrastructureLogging options
 * @returns {void}
 */
const applyInfrastructureLoggingDefaults = infrastructureLogging => {
	D(infrastructureLogging, "level", "info");
	D(infrastructureLogging, "debug", false);
};

exports.applyWebpackOptionsBaseDefaults = applyWebpackOptionsBaseDefaults;
exports.applyWebpackOptionsDefaults = applyWebpackOptionsDefaults;
