/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const fs = require("fs");
const path = require("path");
const Template = require("../Template");
const { cleverMerge } = require("../util/cleverMerge");
const {
	getTargetsProperties,
	getTargetProperties,
	getDefaultTarget
} = require("./target");

/** @typedef {import("../../declarations/WebpackOptions").CacheOptionsNormalized} CacheOptions */
/** @typedef {import("../../declarations/WebpackOptions").EntryDescription} EntryDescription */
/** @typedef {import("../../declarations/WebpackOptions").EntryNormalized} Entry */
/** @typedef {import("../../declarations/WebpackOptions").Experiments} Experiments */
/** @typedef {import("../../declarations/WebpackOptions").ExternalsPresets} ExternalsPresets */
/** @typedef {import("../../declarations/WebpackOptions").ExternalsType} ExternalsType */
/** @typedef {import("../../declarations/WebpackOptions").InfrastructureLogging} InfrastructureLogging */
/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../../declarations/WebpackOptions").Library} Library */
/** @typedef {import("../../declarations/WebpackOptions").LibraryName} LibraryName */
/** @typedef {import("../../declarations/WebpackOptions").LibraryOptions} LibraryOptions */
/** @typedef {import("../../declarations/WebpackOptions").Loader} Loader */
/** @typedef {import("../../declarations/WebpackOptions").Mode} Mode */
/** @typedef {import("../../declarations/WebpackOptions").ModuleOptionsNormalized} ModuleOptions */
/** @typedef {import("../../declarations/WebpackOptions").Node} WebpackNode */
/** @typedef {import("../../declarations/WebpackOptions").Optimization} Optimization */
/** @typedef {import("../../declarations/WebpackOptions").OutputNormalized} Output */
/** @typedef {import("../../declarations/WebpackOptions").Performance} Performance */
/** @typedef {import("../../declarations/WebpackOptions").ResolveOptions} ResolveOptions */
/** @typedef {import("../../declarations/WebpackOptions").RuleSetRules} RuleSetRules */
/** @typedef {import("../../declarations/WebpackOptions").SnapshotOptions} SnapshotOptions */
/** @typedef {import("../../declarations/WebpackOptions").Target} Target */
/** @typedef {import("../../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("./target").TargetProperties} TargetProperties */

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
					newArray = value.slice(0, i);
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
	applyInfrastructureLoggingDefaults(options.infrastructureLogging);
};

/**
 * @param {WebpackOptions} options options to be modified
 * @returns {void}
 */
const applyWebpackOptionsDefaults = options => {
	F(options, "context", () => process.cwd());
	F(options, "target", () => {
		return getDefaultTarget(options.context);
	});

	const { mode, name, target } = options;

	let targetProperties =
		target === false
			? /** @type {false} */ (false)
			: typeof target === "string"
			? getTargetProperties(target, options.context)
			: getTargetsProperties(target, options.context);

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
		mode: mode || "production",
		development
	});
	const cache = !!options.cache;

	applySnapshotDefaults(options.snapshot, { production });

	applyExperimentsDefaults(options.experiments);

	applyModuleDefaults(options.module, {
		cache,
		syncWebAssembly: options.experiments.syncWebAssembly,
		asyncWebAssembly: options.experiments.asyncWebAssembly
	});

	applyOutputDefaults(options.output, {
		context: options.context,
		targetProperties,
		outputModule: options.experiments.outputModule,
		development,
		entry: options.entry,
		module: options.module
	});

	applyExternalsPresetsDefaults(options.externalsPresets, { targetProperties });

	applyLoaderDefaults(options.loader, { targetProperties });

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

	applyNodeDefaults(options.node, { targetProperties });

	F(options, "performance", () =>
		production &&
		targetProperties &&
		(targetProperties.browser || targetProperties.browser === null)
			? {}
			: false
	);
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
			targetProperties,
			mode: options.mode
		}),
		options.resolve
	);

	options.resolveLoader = cleverMerge(
		getResolveLoaderDefaults({ cache }),
		options.resolveLoader
	);
};

/**
 * @param {Experiments} experiments options
 * @returns {void}
 */
const applyExperimentsDefaults = experiments => {
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
 * @param {boolean} options.development is development mode
 * @returns {void}
 */
const applyCacheDefaults = (cache, { name, mode, development }) => {
	if (cache === false) return;
	switch (cache.type) {
		case "filesystem":
			F(cache, "name", () => name + "-" + mode);
			D(cache, "version", "");
			F(cache, "cacheDirectory", () => {
				const cwd = process.cwd();
				let dir = cwd;
				for (;;) {
					try {
						if (fs.statSync(path.join(dir, "package.json")).isFile()) break;
						// eslint-disable-next-line no-empty
					} catch (e) {}
					const parent = path.dirname(dir);
					if (dir === parent) {
						dir = undefined;
						break;
					}
					dir = parent;
				}
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
			D(cache, "profile", false);
			D(cache, "idleTimeout", 60000);
			D(cache, "idleTimeoutForInitialStore", 0);
			D(cache, "maxMemoryGenerations", development ? 5 : Infinity);
			D(cache, "maxAge", 1000 * 60 * 60 * 24 * 60); // 1 month
			D(cache, "allowCollectingMemory", development);
			D(cache.buildDependencies, "defaultWebpack", [
				path.resolve(__dirname, "..") + path.sep
			]);
			break;
		case "memory":
			D(cache, "maxGenerations", Infinity);
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
 * @param {JavascriptParserOptions} parserOptions parser options
 * @returns {void}
 */
const applyJavascriptParserOptionsDefaults = parserOptions => {
	D(parserOptions, "unknownContextRequest", ".");
	D(parserOptions, "unknownContextRegExp", false);
	D(parserOptions, "unknownContextRecursive", true);
	D(parserOptions, "unknownContextCritical", true);
	D(parserOptions, "exprContextRequest", ".");
	D(parserOptions, "exprContextRegExp", false);
	D(parserOptions, "exprContextRecursive", true);
	D(parserOptions, "exprContextCritical", true);
	D(parserOptions, "wrappedContextRegExp", /.*/);
	D(parserOptions, "wrappedContextRecursive", true);
	D(parserOptions, "wrappedContextCritical", false);

	D(parserOptions, "strictExportPresence", false);
	D(parserOptions, "strictThisContextOnImports", false);
};

/**
 * @param {ModuleOptions} module options
 * @param {Object} options options
 * @param {boolean} options.cache is caching enabled
 * @param {boolean} options.syncWebAssembly is syncWebAssembly enabled
 * @param {boolean} options.asyncWebAssembly is asyncWebAssembly enabled
 * @returns {void}
 */
const applyModuleDefaults = (
	module,
	{ cache, syncWebAssembly, asyncWebAssembly }
) => {
	if (cache) {
		D(module, "unsafeCache", module => {
			const name = module.nameForCondition();
			return name && NODE_MODULES_REGEXP.test(name);
		});
	} else {
		D(module, "unsafeCache", false);
	}

	F(module.parser, "asset", () => ({}));
	F(module.parser.asset, "dataUrlCondition", () => ({}));
	if (typeof module.parser.asset.dataUrlCondition === "object") {
		D(module.parser.asset.dataUrlCondition, "maxSize", 8096);
	}

	F(module.parser, "javascript", () => ({}));
	applyJavascriptParserOptionsDefaults(module.parser.javascript);

	A(module, "defaultRules", () => {
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
		/** @type {RuleSetRules} */
		const rules = [
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
			},
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
			},
			{
				dependency: "url",
				type: "asset/resource"
			}
		];
		if (asyncWebAssembly) {
			const wasm = {
				type: "webassembly/async",
				rules: [
					{
						descriptionData: {
							type: "module"
						},
						resolve: {
							fullySpecified: true
						}
					}
				]
			};
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
				type: "webassembly/sync",
				rules: [
					{
						descriptionData: {
							type: "module"
						},
						resolve: {
							fullySpecified: true
						}
					}
				]
			};
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
 * @param {TargetProperties | false} options.targetProperties target properties
 * @param {boolean} options.outputModule is outputModule experiment enabled
 * @param {boolean} options.development is development mode
 * @param {Entry} options.entry entry option
 * @param {ModuleOptions} options.module module option
 * @returns {void}
 */
const applyOutputDefaults = (
	output,
	{ context, targetProperties: tp, outputModule, development, entry, module }
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
		const pkgPath = path.resolve(context, "package.json");
		try {
			const packageInfo = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
			return packageInfo.name || "";
		} catch (e) {
			if (e.code !== "ENOENT") {
				e.message += `\nwhile determining default 'output.uniqueName' from 'name' in ${pkgPath}`;
				throw e;
			}
			return "";
		}
	});

	D(output, "filename", "[name].js");
	F(output, "module", () => !!outputModule);
	F(output, "iife", () => !output.module);
	D(output, "importFunctionName", "import");
	D(output, "importMetaName", "import.meta");
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
		if (tp) {
			if (tp.global) return "global";
			if (tp.globalThis) return "globalThis";
		}
		return "self";
	});
	F(output, "chunkFormat", () => {
		if (tp) {
			if (tp.document) return "array-push";
			if (tp.require) return "commonjs";
			if (tp.nodeBuiltins) return "commonjs";
			if (tp.importScripts) return "array-push";
			if (tp.dynamicImport && output.module) return "module";
		}
		return false;
	});
	F(output, "chunkLoading", () => {
		if (tp) {
			switch (output.chunkFormat) {
				case "array-push":
					if (tp.document) return "jsonp";
					if (tp.importScripts) return "import-scripts";
					break;
				case "commonjs":
					if (tp.require) return "require";
					if (tp.nodeBuiltins) return "async-node";
					break;
				case "module":
					if (tp.dynamicImport) return "import";
					break;
			}
			if (
				tp.require === null ||
				tp.nodeBuiltins === null ||
				tp.document === null ||
				tp.importScripts === null
			) {
				return "universal";
			}
		}
		return false;
	});
	F(output, "workerChunkLoading", () => {
		if (tp) {
			switch (output.chunkFormat) {
				case "array-push":
					if (tp.importScriptsInWorker) return "import-scripts";
					break;
				case "commonjs":
					if (tp.require) return "require";
					if (tp.nodeBuiltins) return "async-node";
					break;
				case "module":
					if (tp.dynamicImportInWorker) return "import";
					break;
			}
			if (
				tp.require === null ||
				tp.nodeBuiltins === null ||
				tp.importScriptsInWorker === null
			) {
				return "universal";
			}
		}
		return false;
	});
	F(output, "wasmLoading", () => {
		if (tp) {
			if (tp.fetchWasm) return "fetch";
			if (tp.nodeBuiltins) return "async-node";
			if (tp.nodeBuiltins === null || tp.fetchWasm === null) {
				return "universal";
			}
		}
		return false;
	});
	F(output, "workerWasmLoading", () => output.wasmLoading);
	F(output, "devtoolNamespace", () => output.uniqueName);
	if (output.library) {
		F(output.library, "type", () => (output.module ? "module" : "var"));
	}
	F(output, "path", () => path.join(process.cwd(), "dist"));
	F(output, "pathinfo", () => development);
	D(output, "sourceMapFilename", "[file].map[query]");
	D(output, "hotUpdateChunkFilename", "[id].[fullhash].hot-update.js");
	D(output, "hotUpdateMainFilename", "[runtime].[fullhash].hot-update.json");
	D(output, "crossOriginLoading", false);
	F(output, "scriptType", () => (output.module ? "module" : false));
	D(
		output,
		"publicPath",
		(tp && (tp.document || tp.importScripts)) || output.scriptType === "module"
			? "auto"
			: ""
	);
	D(output, "chunkLoadTimeout", 120000);
	D(output, "hashFunction", "md4");
	D(output, "hashDigest", "hex");
	D(output, "hashDigestLength", 20);
	D(output, "strictModuleExceptionHandling", false);

	const optimistic = v => v || v === undefined;
	F(
		output.environment,
		"arrowFunction",
		() => tp && optimistic(tp.arrowFunction)
	);
	F(output.environment, "const", () => tp && optimistic(tp.const));
	F(
		output.environment,
		"destructuring",
		() => tp && optimistic(tp.destructuring)
	);
	F(output.environment, "forOf", () => tp && optimistic(tp.forOf));
	F(output.environment, "bigIntLiteral", () => tp && tp.bigIntLiteral);
	F(output.environment, "dynamicImport", () => tp && tp.dynamicImport);
	F(output.environment, "module", () => tp && tp.module);

	const { trustedTypes } = output;
	if (trustedTypes) {
		F(
			trustedTypes,
			"policyName",
			() =>
				output.uniqueName.replace(/[^a-zA-Z0-9\-#=_/@.%]+/g, "_") || "webpack"
		);
	}

	/**
	 * @param {function(EntryDescription): void} fn iterator
	 * @returns {void}
	 */
	const forEachEntry = fn => {
		for (const name of Object.keys(entry)) {
			fn(entry[name]);
		}
	};
	A(output, "enabledLibraryTypes", () => {
		const enabledLibraryTypes = [];
		if (output.library) {
			enabledLibraryTypes.push(output.library.type);
		}
		forEachEntry(desc => {
			if (desc.library) {
				enabledLibraryTypes.push(desc.library.type);
			}
		});
		return enabledLibraryTypes;
	});

	A(output, "enabledChunkLoadingTypes", () => {
		const enabledChunkLoadingTypes = new Set();
		if (output.chunkLoading) {
			enabledChunkLoadingTypes.add(output.chunkLoading);
		}
		if (output.workerChunkLoading) {
			enabledChunkLoadingTypes.add(output.workerChunkLoading);
		}
		forEachEntry(desc => {
			if (desc.chunkLoading) {
				enabledChunkLoadingTypes.add(desc.chunkLoading);
			}
		});
		return Array.from(enabledChunkLoadingTypes);
	});

	A(output, "enabledWasmLoadingTypes", () => {
		const enabledWasmLoadingTypes = new Set();
		if (output.wasmLoading) {
			enabledWasmLoadingTypes.add(output.wasmLoading);
		}
		if (output.workerWasmLoading) {
			enabledWasmLoadingTypes.add(output.workerWasmLoading);
		}
		forEachEntry(desc => {
			if (desc.wasmLoading) {
				enabledWasmLoadingTypes.add(desc.wasmLoading);
			}
		});
		return Array.from(enabledWasmLoadingTypes);
	});
};

/**
 * @param {ExternalsPresets} externalsPresets options
 * @param {Object} options options
 * @param {TargetProperties | false} options.targetProperties target properties
 * @returns {void}
 */
const applyExternalsPresetsDefaults = (
	externalsPresets,
	{ targetProperties }
) => {
	D(externalsPresets, "web", targetProperties && targetProperties.web);
	D(externalsPresets, "node", targetProperties && targetProperties.node);
	D(externalsPresets, "nwjs", targetProperties && targetProperties.nwjs);
	D(
		externalsPresets,
		"electron",
		targetProperties && targetProperties.electron
	);
	D(
		externalsPresets,
		"electronMain",
		targetProperties &&
			targetProperties.electron &&
			targetProperties.electronMain
	);
	D(
		externalsPresets,
		"electronPreload",
		targetProperties &&
			targetProperties.electron &&
			targetProperties.electronPreload
	);
	D(
		externalsPresets,
		"electronRenderer",
		targetProperties &&
			targetProperties.electron &&
			targetProperties.electronRenderer
	);
};

/**
 * @param {Loader} loader options
 * @param {Object} options options
 * @param {TargetProperties | false} options.targetProperties target properties
 * @returns {void}
 */
const applyLoaderDefaults = (loader, { targetProperties }) => {
	F(loader, "target", () => {
		if (targetProperties) {
			if (targetProperties.electron) {
				if (targetProperties.electronMain) return "electron-main";
				if (targetProperties.electronPreload) return "electron-preload";
				if (targetProperties.electronRenderer) return "electron-renderer";
				return "electron";
			}
			if (targetProperties.nwjs) return "nwjs";
			if (targetProperties.node) return "node";
			if (targetProperties.web) return "web";
		}
	});
};

/**
 * @param {WebpackNode} node options
 * @param {Object} options options
 * @param {TargetProperties | false} options.targetProperties target properties
 * @returns {void}
 */
const applyNodeDefaults = (node, { targetProperties }) => {
	if (node === false) return;
	F(node, "global", () => {
		if (targetProperties && targetProperties.global) return false;
		return true;
	});
	F(node, "__filename", () => {
		if (targetProperties && targetProperties.node) return "eval-only";
		return "mock";
	});
	F(node, "__dirname", () => {
		if (targetProperties && targetProperties.node) return "eval-only";
		return "mock";
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
	F(optimization, "sideEffects", () => (production ? true : "flag"));
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
		A(splitChunks, "defaultSizeTypes", () => ["javascript", "unknown"]);
		D(splitChunks, "hidePathInfo", production);
		D(splitChunks, "chunks", "async");
		D(splitChunks, "usedExports", optimization.usedExports === true);
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
 * @param {TargetProperties | false} options.targetProperties target properties
 * @param {Mode} options.mode mode
 * @returns {ResolveOptions} resolve options
 */
const getResolveDefaults = ({ cache, context, targetProperties, mode }) => {
	/** @type {string[]} */
	const conditions = ["webpack"];

	conditions.push(mode === "development" ? "development" : "production");

	if (targetProperties) {
		if (targetProperties.webworker) conditions.push("worker");
		if (targetProperties.node) conditions.push("node");
		if (targetProperties.web) conditions.push("browser");
		if (targetProperties.electron) conditions.push("electron");
		if (targetProperties.nwjs) conditions.push("nwjs");
	}

	const jsExtensions = [".js", ".json", ".wasm"];

	const tp = targetProperties;
	const browserField =
		tp && tp.web && (!tp.node || (tp.electron && tp.electronRenderer));

	/** @type {function(): ResolveOptions} */
	const cjsDeps = () => ({
		aliasFields: browserField ? ["browser"] : [],
		mainFields: browserField ? ["browser", "module", "..."] : ["module", "..."],
		conditionNames: ["require", "module", "..."],
		extensions: [...jsExtensions]
	});
	/** @type {function(): ResolveOptions} */
	const esmDeps = () => ({
		aliasFields: browserField ? ["browser"] : [],
		mainFields: browserField ? ["browser", "module", "..."] : ["module", "..."],
		conditionNames: ["import", "module", "..."],
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
			loaderImport: esmDeps(),
			url: {
				preferRelative: true
			},
			worker: {
				...esmDeps(),
				preferRelative: true
			},
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
	F(infrastructureLogging, "stream", () => process.stderr);
	const tty =
		/** @type {any} */ (infrastructureLogging.stream).isTTY &&
		process.env.TERM !== "dumb";
	D(infrastructureLogging, "level", "info");
	D(infrastructureLogging, "debug", false);
	D(infrastructureLogging, "colors", tty);
	D(infrastructureLogging, "appendOnly", !tty);
};

exports.applyWebpackOptionsBaseDefaults = applyWebpackOptionsBaseDefaults;
exports.applyWebpackOptionsDefaults = applyWebpackOptionsDefaults;
