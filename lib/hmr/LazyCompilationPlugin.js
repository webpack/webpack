/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { RawSource } = require("webpack-sources");
const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const Dependency = require("../Dependency");
const Module = require("../Module");
const ModuleFactory = require("../ModuleFactory");
const { JAVASCRIPT_TYPES } = require("../ModuleSourceTypeConstants");
const { JAVASCRIPT_TYPE } = require("../ModuleSourceTypeConstants");
const {
	WEBPACK_MODULE_TYPE_LAZY_COMPILATION_PROXY
} = require("../ModuleTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const CommonJsRequireDependency = require("../dependencies/CommonJsRequireDependency");
const { resolveByProperty } = require("../util/cleverMerge");
const { registerNotSerializable } = require("../util/serialization");

/** @typedef {import("../config/defaults").WebpackOptionsNormalizedWithDefaults} WebpackOptions */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../Module").BuildCallback} BuildCallback */
/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../Module").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("../Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("../Module").LibIdentOptions} LibIdentOptions */
/** @typedef {import("../Module").LibIdent} LibIdent */
/** @typedef {import("../Module").NeedBuildCallback} NeedBuildCallback */
/** @typedef {import("../Module").NeedBuildContext} NeedBuildContext */
/** @typedef {import("../Module").SourceTypes} SourceTypes */
/** @typedef {import("../Module").Sources} Sources */
/** @typedef {import("../Module").RuntimeRequirements} RuntimeRequirements */
/** @typedef {import("../ModuleFactory").ModuleFactoryCallback} ModuleFactoryCallback */
/** @typedef {import("../ModuleFactory").ModuleFactoryCreateData} ModuleFactoryCreateData */
/** @typedef {import("../RequestShortener")} RequestShortener */
/** @typedef {import("../ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("../dependencies/HarmonyImportDependency")} HarmonyImportDependency */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/fs").InputFileSystem} InputFileSystem */

/** @typedef {{ client: string, data: string, active: boolean }} ModuleResult */

/**
 * Library wrappers of these types pass external modules as closure arguments
 * (e.g. `__WEBPACK_EXTERNAL_MODULE_react__`) baked into the entry chunk at
 * render time. When `lazyCompilation` activates a proxy for the first time,
 * any external dependency the lazily-built module pulls in lands in a hot
 * update chunk that lives outside the original wrapper closure, so the
 * factory body can't resolve its closure identifier and throws at runtime.
 * Reserving the externals up front (during the inactive build) folds them
 * into the initial wrapper, so the closure identifiers are already defined
 * when the activation update arrives.
 */
const CLOSURE_LIBRARY_TYPES = new Set([
	"umd",
	"umd2",
	"amd",
	"amd-require",
	"system"
]);

/**
 * `enabledLibraryTypes` covers both the global `output.library.type` and any
 * per-entry `entry.<name>.library.type`, so a UMD/AMD/System wrapper attached
 * to an individual entry is still detected.
 * @param {import("../../declarations/WebpackOptions").OutputNormalized} output normalized output option
 * @returns {boolean} true when at least one library wrapper passes externals as closure arguments
 */
const hasClosureLibrary = (output) => {
	const enabled = output.enabledLibraryTypes;
	if (enabled) {
		for (const type of enabled) {
			if (CLOSURE_LIBRARY_TYPES.has(type)) return true;
		}
	}
	if (output.library && output.library.type) {
		return CLOSURE_LIBRARY_TYPES.has(output.library.type);
	}
	return false;
};

/**
 * Collects request strings from statically-enumerable externals (string,
 * object, and arrays of those). Function and RegExp forms are skipped because
 * their effective request set isn't knowable until something asks for it.
 *
 * Layer resolution mirrors `ExternalModuleFactoryPlugin.resolveLayer`: the
 * effective map for the proxy's layer is computed via the same
 * `resolveByProperty(..., "byLayer", layer)` helper that the externals system
 * uses, so `byLayer.default` fallback and function-form `byLayer` entries are
 * honored the same way.
 *
 * Entries whose effective value is `false` are skipped — `false` explicitly
 * disables externalization for that request, and reserving it would force the
 * real module into the entry chunk.
 * @param {import("../../declarations/WebpackOptions").Externals | undefined} externals normalized externals option
 * @param {string | null} layer issuer layer for which to resolve `byLayer`
 * @returns {Set<string>} requests to reserve in the entry chunk
 */
const collectStaticExternalRequests = (externals, layer) => {
	/** @type {Set<string>} */
	const requests = new Set();
	if (!externals) return requests;
	/** @param {import("../../declarations/WebpackOptions").ExternalItem} item one item */
	const visit = (item) => {
		if (typeof item === "string") {
			requests.add(item);
			return;
		}
		if (!item || typeof item !== "object" || item instanceof RegExp) return;
		const resolved = /** @type {Record<string, unknown>} */ (
			resolveByProperty(
				/** @type {Record<string, unknown>} */ (item),
				"byLayer",
				layer
			)
		);
		for (const [request, value] of Object.entries(resolved)) {
			// `false` explicitly opts the request out of externalization; reserving
			// it would pull the actual module into the entry chunk.
			if (value === false) continue;
			requests.add(request);
		}
	};
	if (Array.isArray(externals)) {
		for (const item of externals) visit(item);
	} else {
		visit(externals);
	}
	return requests;
};

/**
 * Defines the backend api type used by this module.
 * @typedef {object} BackendApi
 * @property {(callback: (err?: (Error | null)) => void) => void} dispose
 * @property {(module: Module) => ModuleResult} module
 */

const HMR_DEPENDENCY_TYPES = new Set([
	"import.meta.webpackHot.accept",
	"import.meta.webpackHot.decline",
	"module.hot.accept",
	"module.hot.decline"
]);

/**
 * Checks true, if the module should be selected.
 * @param {Options["test"]} test test option
 * @param {Module} module the module
 * @returns {boolean | null | string} true, if the module should be selected
 */
const checkTest = (test, module) => {
	if (test === undefined) return true;
	if (typeof test === "function") {
		return test(module);
	}
	if (typeof test === "string") {
		const name = module.nameForCondition();
		return name && name.startsWith(test);
	}
	if (test instanceof RegExp) {
		const name = module.nameForCondition();
		return name && test.test(name);
	}
	return false;
};

class LazyCompilationDependency extends Dependency {
	/**
	 * Creates an instance of LazyCompilationDependency.
	 * @param {LazyCompilationProxyModule} proxyModule proxy module
	 */
	constructor(proxyModule) {
		super();
		/** @type {LazyCompilationProxyModule} */
		this.proxyModule = proxyModule;
	}

	get category() {
		return "esm";
	}

	get type() {
		return "lazy import()";
	}

	/**
	 * Returns an identifier to merge equal requests.
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return this.proxyModule.originalModule.identifier();
	}
}

registerNotSerializable(LazyCompilationDependency);

/**
 * Defines the build info properties specific to lazy compilation proxy modules.
 * @typedef {object} KnownLazyCompilationProxyModuleBuildInfo
 * @property {boolean=} active whether the proxied module was active when built
 */

/** @typedef {BuildInfo & KnownLazyCompilationProxyModuleBuildInfo} LazyCompilationProxyModuleBuildInfo */

class LazyCompilationProxyModule extends Module {
	/**
	 * Creates an instance of LazyCompilationProxyModule.
	 * @param {string} context context
	 * @param {Module} originalModule an original module
	 * @param {string} request request
	 * @param {ModuleResult["client"]} client client
	 * @param {ModuleResult["data"]} data data
	 * @param {ModuleResult["active"]} active true when active, otherwise false
	 */
	constructor(context, originalModule, request, client, data, active) {
		super(
			WEBPACK_MODULE_TYPE_LAZY_COMPILATION_PROXY,
			context,
			originalModule.layer
		);
		// Redeclared with the lazy compilation proxy specific shape
		/** @type {LazyCompilationProxyModuleBuildInfo | undefined} */
		this.buildInfo = undefined;
		/** @type {Module} */
		this.originalModule = originalModule;
		/** @type {string} */
		this.request = request;
		/** @type {string} */
		this.client = client;
		/** @type {string} */
		this.data = data;
		/** @type {boolean} */
		this.active = active;
	}

	/**
	 * Returns the unique identifier used to reference this module.
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return `${WEBPACK_MODULE_TYPE_LAZY_COMPILATION_PROXY}|${this.originalModule.identifier()}`;
	}

	/**
	 * Returns a human-readable identifier for this module.
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return `${WEBPACK_MODULE_TYPE_LAZY_COMPILATION_PROXY} ${this.originalModule.readableIdentifier(
			requestShortener
		)}`;
	}

	/**
	 * Assuming this module is in the cache. Update the (cached) module with
	 * the fresh module from the factory. Usually updates internal references
	 * and properties.
	 * @param {Module} module fresh module
	 * @returns {void}
	 */
	updateCacheModule(module) {
		super.updateCacheModule(module);
		const m = /** @type {LazyCompilationProxyModule} */ (module);
		this.originalModule = m.originalModule;
		this.request = m.request;
		this.client = m.client;
		this.data = m.data;
		this.active = m.active;
	}

	/**
	 * Gets the library identifier.
	 * @param {LibIdentOptions} options options
	 * @returns {LibIdent | null} an identifier for library inclusion
	 */
	libIdent(options) {
		return `${this.originalModule.libIdent(
			options
		)}!${WEBPACK_MODULE_TYPE_LAZY_COMPILATION_PROXY}`;
	}

	/**
	 * Checks whether the module needs to be rebuilt for the current build state.
	 * @param {NeedBuildContext} context context info
	 * @param {NeedBuildCallback} callback callback function, returns true, if the module needs a rebuild
	 * @returns {void}
	 */
	needBuild(context, callback) {
		callback(null, !this.buildInfo || this.buildInfo.active !== this.active);
	}

	/**
	 * Builds the module using the provided compilation context.
	 * @param {WebpackOptions} options webpack options
	 * @param {Compilation} compilation the compilation
	 * @param {ResolverWithOptions} resolver the resolver
	 * @param {InputFileSystem} fs the file system
	 * @param {BuildCallback} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
		this.buildInfo = {
			active: this.active
		};
		/** @type {BuildMeta} */
		this.buildMeta = {};
		this.clearDependenciesAndBlocks();
		const dep = new CommonJsRequireDependency(this.client);
		this.addDependency(dep);
		if (this.active) {
			const dep = new LazyCompilationDependency(this);
			const block = new AsyncDependenciesBlock({});
			block.addDependency(dep);
			this.addBlock(block);
		} else if (hasClosureLibrary(compilation.options.output)) {
			// Reserve statically-declared externals as dependencies of the inactive
			// proxy so the initial entry chunk's library wrapper already exposes
			// their closure identifiers (e.g. `__WEBPACK_EXTERNAL_MODULE_react__`).
			// Once the proxy activates and the lazily-built module references those
			// externals, the identifiers resolve normally instead of throwing.
			const requests = collectStaticExternalRequests(
				options.externals,
				this.layer
			);
			for (const request of requests) {
				this.addDependency(new CommonJsRequireDependency(request));
			}
		}
		callback();
	}

	/**
	 * Returns the source types this module can generate.
	 * @returns {SourceTypes} types available (do not mutate)
	 */
	getSourceTypes() {
		return JAVASCRIPT_TYPES;
	}

	/**
	 * Returns the estimated size for the requested source type.
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		return 200;
	}

	/**
	 * Generates code and runtime requirements for this module.
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration({ runtimeTemplate, chunkGraph, moduleGraph }) {
		/** @type {Sources} */
		const sources = new Map();
		/** @type {RuntimeRequirements} */
		const runtimeRequirements = new Set();
		runtimeRequirements.add(RuntimeGlobals.module);
		const clientDep = /** @type {CommonJsRequireDependency} */ (
			this.dependencies[0]
		);
		const clientModule = moduleGraph.getModule(clientDep);
		const block = this.blocks[0];
		const cst = runtimeTemplate.renderConst();
		const lt = runtimeTemplate.renderLet();
		const client = Template.asString([
			`${cst} client = ${runtimeTemplate.moduleExports({
				module: clientModule,
				chunkGraph,
				request: clientDep.userRequest,
				runtimeRequirements
			})}`,
			`${cst} data = ${JSON.stringify(this.data)};`
		]);
		const keepActive = Template.asString([
			`${cst} dispose = client.keepAlive({ data: data, active: ${JSON.stringify(
				Boolean(block)
			)}, module: module, onError: onError });`
		]);
		/** @type {string} */
		let source;
		if (block) {
			const dep = block.dependencies[0];
			const module = /** @type {Module} */ (moduleGraph.getModule(dep));
			source = Template.asString([
				client,
				`module.exports = ${runtimeTemplate.moduleNamespacePromise({
					chunkGraph,
					block,
					module,
					request: this.request,
					dependency: dep,
					strict: false, // TODO this should be inherited from the original module
					message: "import()",
					runtimeRequirements
				})};`,
				"if (module.hot) {",
				Template.indent([
					"module.hot.accept();",
					`module.hot.accept(${JSON.stringify(
						chunkGraph.getModuleId(module)
					)}, function() { module.hot.invalidate(); });`,
					"module.hot.dispose(function(data) { delete data.resolveSelf; dispose(data); });",
					`if (${runtimeTemplate.optionalChaining("module.hot.data", "resolveSelf")}) module.hot.data.resolveSelf(module.exports);`
				]),
				"}",
				"function onError() { /* ignore */ }",
				keepActive
			]);
		} else {
			source = Template.asString([
				client,
				`${lt} resolveSelf, onError;`,
				"module.exports = new Promise(function(resolve, reject) { resolveSelf = resolve; onError = reject; });",
				"if (module.hot) {",
				Template.indent([
					"module.hot.accept();",
					`if (${runtimeTemplate.optionalChaining("module.hot.data", "resolveSelf")}) module.hot.data.resolveSelf(module.exports);`,
					"module.hot.dispose(function(data) { data.resolveSelf = resolveSelf; dispose(data); });"
				]),
				"}",
				keepActive
			]);
		}
		sources.set(JAVASCRIPT_TYPE, new RawSource(source));
		return {
			sources,
			runtimeRequirements
		};
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		super.updateHash(hash, context);
		hash.update(this.active ? "active" : "");
		hash.update(JSON.stringify(this.data));
	}
}

registerNotSerializable(LazyCompilationProxyModule);

class LazyCompilationDependencyFactory extends ModuleFactory {
	constructor() {
		super();
	}

	/**
	 * Processes the provided data.
	 * @param {ModuleFactoryCreateData} data data object
	 * @param {ModuleFactoryCallback} callback callback
	 * @returns {void}
	 */
	create(data, callback) {
		const dependency =
			/** @type {LazyCompilationDependency} */
			(data.dependencies[0]);
		callback(null, {
			module: dependency.proxyModule.originalModule
		});
	}
}

/**
 * Defines the backend handler callback.
 * @callback BackendHandler
 * @param {Compiler} compiler compiler
 * @param {(err: Error | null, backendApi?: BackendApi) => void} callback callback
 * @returns {void}
 */

/**
 * Defines the promise backend handler callback.
 * @callback PromiseBackendHandler
 * @param {Compiler} compiler compiler
 * @returns {Promise<BackendApi>} backend
 */

/** @typedef {BackendHandler | PromiseBackendHandler} BackEnd */

/** @typedef {(module: Module) => boolean} TestFn */

/**
 * Defines the options type used by this module.
 * @typedef {object} Options options
 * @property {BackEnd} backend the backend
 * @property {boolean=} entries
 * @property {boolean=} imports
 * @property {RegExp | string | TestFn=} test additional filter for lazy compiled entrypoint modules
 */

const PLUGIN_NAME = "LazyCompilationPlugin";

class LazyCompilationPlugin {
	/**
	 * Creates an instance of LazyCompilationPlugin.
	 * @param {Options} options options
	 */
	constructor({ backend, entries, imports, test }) {
		/** @type {BackEnd} */
		this.backend = backend;
		/** @type {boolean | undefined} */
		this.entries = entries;
		/** @type {boolean | undefined} */
		this.imports = imports;
		/** @type {string | RegExp | TestFn | undefined} */
		this.test = test;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		/** @type {BackendApi} */
		let backend;
		compiler.hooks.beforeCompile.tapAsync(PLUGIN_NAME, (params, callback) => {
			if (backend !== undefined) return callback();
			const promise = this.backend(compiler, (err, result) => {
				if (err) return callback(err);
				backend = /** @type {BackendApi} */ (result);
				callback();
			});
			if (promise && promise.then) {
				promise.then((b) => {
					backend = b;
					callback();
				}, callback);
			}
		});
		compiler.hooks.thisCompilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				normalModuleFactory.hooks.module.tap(
					PLUGIN_NAME,
					(module, createData, resolveData) => {
						if (
							resolveData.dependencies.every((dep) =>
								HMR_DEPENDENCY_TYPES.has(dep.type)
							)
						) {
							// for HMR only resolving, try to determine if the HMR accept/decline refers to
							// an import() or not
							const hmrDep = resolveData.dependencies[0];
							const originModule =
								/** @type {Module} */
								(compilation.moduleGraph.getParentModule(hmrDep));
							const isReferringToDynamicImport = originModule.blocks.some(
								(block) =>
									block.dependencies.some(
										(dep) =>
											dep.type === "import()" &&
											/** @type {HarmonyImportDependency} */ (dep).request ===
												hmrDep.request
									)
							);
							if (!isReferringToDynamicImport) return module;
						} else if (
							!resolveData.dependencies.every(
								(dep) =>
									HMR_DEPENDENCY_TYPES.has(dep.type) ||
									(this.imports &&
										(dep.type === "import()" ||
											dep.type === "import() context element")) ||
									(this.entries && dep.type === "entry")
							)
						) {
							return module;
						}
						if (
							/webpack[/\\]hot[/\\]|webpack-dev-server[/\\]client|webpack-hot-middleware[/\\]client/.test(
								resolveData.request
							) ||
							!checkTest(this.test, module)
						) {
							return module;
						}
						const moduleInfo = backend.module(module);
						if (!moduleInfo) return module;
						const { client, data, active } = moduleInfo;

						return new LazyCompilationProxyModule(
							compiler.context,
							module,
							resolveData.request,
							client,
							data,
							active
						);
					}
				);
				compilation.dependencyFactories.set(
					LazyCompilationDependency,
					new LazyCompilationDependencyFactory()
				);
			}
		);
		compiler.hooks.shutdown.tapAsync(PLUGIN_NAME, (callback) => {
			backend.dispose(callback);
		});
	}
}

module.exports = LazyCompilationPlugin;
