/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");
const Template = require("../Template");
const { cleverMerge } = require("../util/cleverMerge");

/** @typedef {import("../../declarations/WebpackOptions").CacheOptionsNormalized} CacheOptions */
/** @typedef {import("../../declarations/WebpackOptions").Experiments} Experiments */
/** @typedef {import("../../declarations/WebpackOptions").ExternalsType} ExternalsType */
/** @typedef {import("../../declarations/WebpackOptions").InfrastructureLogging} InfrastructureLogging */
/** @typedef {import("../../declarations/WebpackOptions").Library} Library */
/** @typedef {import("../../declarations/WebpackOptions").LibraryName} LibraryName */
/** @typedef {import("../../declarations/WebpackOptions").LibraryOptions} LibraryOptions */
/** @typedef {import("../../declarations/WebpackOptions").Mode} Mode */
/** @typedef {import("../../declarations/WebpackOptions").ModuleOptions} ModuleOptions */
/** @typedef {import("../../declarations/WebpackOptions").Node} WebpackNode */
/** @typedef {import("../../declarations/WebpackOptions").Optimization} Optimization */
/** @typedef {import("../../declarations/WebpackOptions").Output} Output */
/** @typedef {import("../../declarations/WebpackOptions").Performance} Performance */
/** @typedef {import("../../declarations/WebpackOptions").ResolveOptions} ResolveOptions */
/** @typedef {import("../../declarations/WebpackOptions").RuleSetRules} RuleSetRules */
/** @typedef {import("../../declarations/WebpackOptions").SnapshotOptions} SnapshotOptions */
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
 * Sets a dynamic default value when undefined, by calling the factory function.
 * factory must return an array or undefined
 * When the current value is already an array an contains "..." it's replaced with
 * the result of the factory function
 * @template T
 * @template {keyof T} P
 * @param {T} obj an object
 * @param {P} prop a property of this object
 * @param {function(): T[P]} factory a default value factory for the property
 * @returns {void}
 */
const A = (obj, prop, factory) => {
	const value = obj[prop];
	if (value === undefined) {
		obj[prop] = factory();
	} else if (Array.isArray(value)) {
		/** @type {any[]} */
		let newArray = undefined;
		for (let i = 0; i < value.length; i++) {
			const item = value[i];
			if (item === "...") {
				if (newArray === undefined) {
					newArray = i > 0 ? value.slice(0, i - 1) : [];
					obj[prop] = /** @type {T[P]} */ (/** @type {unknown} */ (newArray));
				}
				const items = /** @type {any[]} */ (/** @type {unknown} */ (factory()));
				if (items !== undefined) {
					for (const item of items) {
						newArray.push(item);
					}
				}
			} else if (newArray !== undefined) {
				newArray.push(item);
			}
		}
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

	if (typeof options.entry !== "function") {
		for (const key of Object.keys(options.entry)) {
			F(
				options.entry[key],
				"import",
				() => /** @type {[string]} */ (["./src"])
			);
		}
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

	applySnapshotDefaults(options.snapshot, { production });

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

	A(options.output, "enabledLibraryTypes", () => {
		const enabledLibraryTypes = [];
		if (options.output.library) {
			enabledLibraryTypes.push(options.output.library.type);
		}
		for (const name of Object.keys(options.entry)) {
			const desc = options.entry[name];
			if (desc.library) {
				enabledLibraryTypes.push(desc.library.type);
			}
		}
		return enabledLibraryTypes;
	});

	A(options.output, "enabledChunkLoadingTypes", () => {
		const enabledChunkLoadingTypes = [];
		if (options.output.chunkLoading) {
			enabledChunkLoadingTypes.push(options.output.chunkLoading);
		}
		for (const name of Object.keys(options.entry)) {
			const desc = options.entry[name];
			if (desc.chunkLoading) {
				enabledChunkLoadingTypes.push(desc.chunkLoading);
			}
		}
		return enabledChunkLoadingTypes;
	});

	F(options, "externalsType", () => {
		const validExternalTypes = require("../../schemas/WebpackOptions.json")
			.definitions.ExternalsType.enum;
		return options.output.library &&
			validExternalTypes.includes(options.output.library.type)
			? /** @type {ExternalsType} */ (options.output.library.type)
			: options.output.module
			? "module"
			: "var";
	});

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

	options.resolve = cleverMerge(
		getResolveDefaults({
			cache,
			context: options.context,
			webTarget,
			target,
			mode: options.mode
		}),
		options.resolve
	);

	options.resolveLoader = cleverMerge(
		getResolveLoaderDefaults({ cache }),
		options.resolveLoader
	);

	applyInfrastructureLoggingDefaults(options.infrastructureLogging);
};

/**
 * @param {Experiments} experiments options
 * @returns {void}
 */
const applyExperimentsDefaults = experiments => {
	D(experiments, "asset", false);
	D(experiments, "mjs", false);
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
};

/**
 * @param {SnapshotOptions} snapshot options
 * @param {Object} options options
 * @param {boolean} options.production is production
 * @returns {void}
 */
const applySnapshotDefaults = (snapshot, { production }) => {
	A(snapshot, "managedPaths", () => {
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
	A(snapshot, "immutablePaths", () => {
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
	F(snapshot, "resolveBuildDependencies", () => ({
		timestamp: true,
		hash: true
	}));
	F(snapshot, "buildDependencies", () => ({ timestamp: true, hash: true }));
	F(snapshot, "module", () =>
		production ? { timestamp: true, hash: true } : { timestamp: true }
	);
	F(snapshot, "resolve", () =>
		production ? { timestamp: true, hash: true } : { timestamp: true }
	);
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

	A(module, "defaultRules", () => {
		/** @type {RuleSetRules} */
		const rules = [
			{
				type: "javascript/auto"
			},
			{
				mimetype: "application/node",
				type: "javascript/auto"
			},
			{
				test: /\.json$/i,
				type: "json"
			},
			{
				mimetype: "application/json",
				type: "json"
			}
		];
		if (mjs) {
			const esm = {
				type: "javascript/esm",
				resolve: {
					byDependency: {
						esm: {
							fullySpecified: true
						}
					}
				}
			};
			const commonjs = {
				type: "javascript/dynamic"
			};
			rules.push(
				{
					test: /\.mjs$/i,
					...esm
				},
				{
					test: /\.js$/i,
					descriptionData: {
						type: "module"
					},
					...esm
				},
				{
					test: /\.cjs$/i,
					...commonjs
				},
				{
					test: /\.js$/i,
					descriptionData: {
						type: "commonjs"
					},
					...commonjs
				},
				{
					mimetype: {
						or: ["text/javascript", "application/javascript"]
					},
					...esm
				}
			);
		} else {
			rules.push({
				mimetype: {
					or: ["text/javascript", "application/javascript"]
				},
				type: "javascript/auto"
			});
		}
		if (asyncWebAssembly) {
			const wasm = {
				type: "webassembly/async"
			};
			if (mjs) {
				wasm.rules = [
					{
						descriptionData: {
							type: "module"
						},
						resolve: {
							fullySpecified: true
						}
					}
				];
			}
			rules.push({
				test: /\.wasm$/i,
				...wasm
			});
			rules.push({
				mimetype: "application/wasm",
				...wasm
			});
		} else if (syncWebAssembly) {
			const wasm = {
				type: "webassembly/sync"
			};
			if (mjs) {
				wasm.rules = [
					{
						descriptionData: {
							type: "module"
						},
						resolve: {
							fullySpecified: true
						}
					}
				];
			}
			rules.push({
				test: /\.wasm$/i,
				...wasm
			});
			rules.push({
				mimetype: "application/wasm",
				...wasm
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
	D(output, "importFunctionName", "import");
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
	D(output, "assetModuleFilename", "[hash][ext][query]");
	D(output, "webassemblyModuleFilename", "[hash].module.wasm");
	D(output, "publicPath", "");
	D(output, "compareBeforeEmit", true);
	D(output, "charset", true);
	F(output, "hotUpdateGlobal", () =>
		Template.toIdentifier(
			"webpackHotUpdate" + Template.toIdentifier(output.uniqueName)
		)
	);
	F(output, "chunkLoadingGlobal", () =>
		Template.toIdentifier(
			"webpackChunk" + Template.toIdentifier(output.uniqueName)
		)
	);
	F(output, "globalObject", () => {
		switch (target) {
			case "web":
			case "webworker":
			case "electron-renderer":
			case "node-webkit":
				return "self";
			case "node":
			case "async-node":
			case "electron-main":
			case "electron-preload":
				return "global";
			default:
				return "self";
		}
	});
	F(output, "chunkFormat", () => {
		switch (target) {
			case "web":
			case "webworker":
			case "electron-renderer":
			case "node-webkit":
				return "array-push";
			case "node":
			case "async-node":
			case "electron-main":
			case "electron-preload":
				return "commonjs";
			default:
				return false;
		}
	});
	F(output, "chunkLoading", () => {
		switch (target) {
			case "web":
			case "electron-renderer":
			case "node-webkit":
				return "jsonp";
			case "webworker":
				return "import-scripts";
			case "node":
			case "electron-main":
			case "electron-preload":
				return "require";
			case "async-node":
				return "async-node";
			default:
				return false;
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
	F(output, "scriptType", () => (output.module ? "module" : false));
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
	D(optimization, "usedExports", production);
	D(optimization, "innerGraph", production);
	D(optimization, "mangleExports", production);
	D(optimization, "concatenateModules", production);
	D(optimization, "runtimeChunk", false);
	D(optimization, "emitOnErrors", !production);
	D(optimization, "checkWasmTypes", production);
	D(optimization, "mangleWasmImports", false);
	D(optimization, "portableRecords", records);
	D(optimization, "realContentHash", production);
	D(optimization, "minimize", production);
	A(optimization, "minimizer", () => [
		{
			apply: compiler => {
				// Lazy load the Terser plugin
				const TerserPlugin = require("terser-webpack-plugin");
				new TerserPlugin({
					terserOptions: {
						compress: {
							passes: 2
						}
					}
				}).apply(compiler);
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
		D(splitChunks, "usedExports", true);
		D(splitChunks, "minChunks", 1);
		F(splitChunks, "minSize", () => (production ? 20000 : 10000));
		F(splitChunks, "minRemainingSize", () => (development ? 0 : undefined));
		F(splitChunks, "enforceSizeThreshold", () => (production ? 50000 : 30000));
		F(splitChunks, "maxAsyncRequests", () => (production ? 30 : Infinity));
		F(splitChunks, "maxInitialRequests", () => (production ? 30 : Infinity));
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
 * @param {Object} options options
 * @param {boolean} options.cache is cache enable
 * @param {string} options.context build context
 * @param {boolean} options.webTarget is a web-like target
 * @param {Target} options.target target
 * @param {Mode} options.mode mode
 * @returns {ResolveOptions} resolve options
 */
const getResolveDefaults = ({ cache, context, webTarget, target, mode }) => {
	/** @type {string[]} */
	const conditions = ["webpack"];

	conditions.push(mode === "development" ? "development" : "production");

	switch (target) {
		case "webworker":
			conditions.push("worker");
			break;
		case "node":
		case "async-node":
		case "node-webkit":
			conditions.push("node");
			break;
		case "electron-main":
		case "electron-preload":
			conditions.push("node");
			conditions.push("electron");
			break;
		case "electron-renderer":
			conditions.push("electron");
			break;
	}

	const jsExtensions = [".js", ".json", ".wasm"];

	/** @type {function(): ResolveOptions} */
	const cjsDeps = () => ({
		aliasFields: webTarget ? ["browser"] : [],
		mainFields: webTarget ? ["browser", "module", "..."] : ["module", "..."],
		conditionNames: webTarget
			? ["require", "module", "browser", "..."]
			: ["require", "module", "..."],
		extensions: [...jsExtensions]
	});
	/** @type {function(): ResolveOptions} */
	const esmDeps = () => ({
		aliasFields: webTarget ? ["browser"] : [],
		mainFields: webTarget ? ["browser", "module", "..."] : ["module", "..."],
		conditionNames: webTarget
			? ["import", "module", "browser", "..."]
			: ["import", "module", "..."],
		extensions: [...jsExtensions]
	});

	/** @type {ResolveOptions} */
	const resolveOptions = {
		cache,
		modules: ["node_modules"],
		conditionNames: conditions,
		mainFiles: ["index"],
		extensions: [],
		aliasFields: [],
		exportsFields: ["exports"],
		roots: [context],
		mainFields: ["main"],
		byDependency: {
			wasm: esmDeps(),
			esm: esmDeps(),
			commonjs: cjsDeps(),
			amd: cjsDeps(),
			// for backward-compat: loadModule
			loader: cjsDeps(),
			// for backward-compat: Custom Dependency
			unknown: cjsDeps(),
			// for backward-compat: getResolve without dependencyType
			undefined: cjsDeps()
		}
	};

	return resolveOptions;
};

/**
 * @param {Object} options options
 * @param {boolean} options.cache is cache enable
 * @returns {ResolveOptions} resolve options
 */
const getResolveLoaderDefaults = ({ cache }) => {
	/** @type {ResolveOptions} */
	const resolveOptions = {
		cache,
		conditionNames: ["loader", "require", "node"],
		exportsFields: ["exports"],
		mainFields: ["loader", "main"],
		extensions: [".js"],
		mainFiles: ["index"]
	};

	return resolveOptions;
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
