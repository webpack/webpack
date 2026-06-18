"use strict";

const fs = require("fs");
const { Module } = require("module");
const path = require("path");
const { fileURLToPath, pathToFileURL } = require("url");
const vm = require("vm");
const {
	getTargetProperties,
	getTargetsProperties
} = require("../../../lib/config/target");

const {
	ESModuleStatus,
	getNodeVersion,
	getSubPath,
	isRelativePath,
	urlToPath,
	urlToRelativePath
} = require("./RunnerHelpers");

const [major] = getNodeVersion();

/** @typedef {import("./RunnerHelpers").ESModuleStatus} ESModuleStatus */

/**
 * @typedef {object} TestMeta
 * @property {string} category
 * @property {string} name
 * @property {number=} round
 */

/**
 * @typedef {object} TestConfig
 * @property {EXPECTED_FUNCTION=} resolveModule
 * @property {EXPECTED_FUNCTION=} moduleScope
 * @property {EXPECTED_FUNCTION=} nonEsmThis
 * @property {boolean=} evaluateScriptOnAttached
 * @property {"jsdom"=} env
 */

/**
 * @typedef {object} TestRunnerOptions
 * @property {string | string[]} target
 * @property {string} outputDirectory
 * @property {TestMeta} testMeta
 * @property {TestConfig} testConfig
 * @property {EXPECTED_ANY} webpackOptions
 */

/**
 * @typedef {object} ModuleInfo
 * @property {string} origin
 * @property {string} subPath
 * @property {string} modulePath
 * @property {string} content
 */

/**
 * @typedef {object} RequireContext
 * @property {typeof ESModuleStatus.Unlinked | typeof ESModuleStatus.Evaluated} esmReturnStatus
 */

/**
 * @typedef {object} ModuleRunner
 * @property {(moduleInfo: ModuleInfo, context: RequireContext) => EXPECTED_ANY} cjs
 * @property {(moduleInfo: ModuleInfo, context: RequireContext) => Promise<EXPECTED_ANY>} esm
 * @property {(moduleInfo: ModuleInfo, context: RequireContext) => EXPECTED_ANY} json
 * @property {(moduleInfo: ModuleInfo, context: RequireContext) => EXPECTED_ANY} raw
 * @property {(moduleInfo: ModuleInfo, context: RequireContext) => EXPECTED_ANY} bytes
 * @property {(moduleInfo: ModuleInfo, context: RequireContext) => EXPECTED_ANY} css
 */

class TestRunner {
	/**
	 * @param {TestRunnerOptions} options test runner options
	 */
	constructor({
		target,
		outputDirectory,
		testMeta,
		testConfig,
		webpackOptions
	}) {
		/** @type {string | string[]} */
		this.target = target;
		/** @type {string} */
		this.outputDirectory = outputDirectory;
		/** @type {TestConfig} */
		this.testConfig = testConfig || {};
		/** @type {TestMeta} */
		this.testMeta = testMeta || {};
		/** @type {EXPECTED_ANY} */
		this.webpackOptions = webpackOptions || {};
		/** @type {import("../../../lib/config/target").TargetProperties | false} */
		this._targetProperties = this._resolveTargetProperties();
		/** @type {boolean} */
		this._runInNewContext = this.hasWebTarget();
		/** @type {EXPECTED_ANY} */
		this._globalContext = this.createBaseGlobalContext();
		/** @type {EXPECTED_ANY} */
		this._esmContext = this.createBaseEsmContext();
		/** @type {EXPECTED_ANY} */
		this._moduleScope = this.createBaseModuleScope();
		/** @type {ModuleRunner} */
		this._moduleRunners = this.createModuleRunners();
	}

	/**
	 * Whether the target is universal, i.e. its merged platform is neither
	 * node- nor web-specific (the `"universal"` preset, or arrays like
	 * `["web", "node"]`, `["web", "electron-main"]`, `["web", "node", "webworker"]`),
	 * so the same bundle runs once per env.
	 * @param {EXPECTED_ANY} webpackOptions webpack options
	 * @returns {boolean} whether target is universal
	 */
	static isUniversalTarget(webpackOptions) {
		const outputModule =
			(webpackOptions.output && webpackOptions.output.module) ||
			(webpackOptions.experiments && webpackOptions.experiments.outputModule);
		const target = webpackOptions.target;

		const targetProperties =
			target === false
				? /** @type {false} */ (false)
				: typeof target === "string"
					? getTargetProperties(
							target,
							/** @type {string} */ (webpackOptions.context)
						)
					: getTargetsProperties(
							/** @type {string[]} */ (target),
							/** @type {string} */ (webpackOptions.context)
						);
		const props =
			/** @type {import("../../../lib/config/target").TargetProperties} */ (
				targetProperties
			);
		return outputModule && props.node === null && props.web === null;
	}

	/**
	 * @param {object} options run options
	 * @param {EXPECTED_ANY[]} options.optionsArr webpack options array
	 * @param {string} options.outputDirectory output directory
	 * @param {EXPECTED_ANY} options.testConfig test config
	 * @param {{ name: string }} options.category test category
	 * @param {string} options.testName test name
	 * @param {(options: { runner: TestRunner, index: number, target: string }) => void} options.setupRunner configure runner
	 * @param {(i: number, options: EXPECTED_ANY, runner: TestRunner) => string | string[] | null | undefined} options.getBundlePaths resolve bundle paths
	 * @returns {{ filesCount: number, results: EXPECTED_ANY[] }} files count and results
	 */
	static runBundles({
		optionsArr,
		outputDirectory,
		testConfig,
		category,
		testName,
		setupRunner,
		getBundlePaths
	}) {
		let filesCount = 0;
		const results = [];
		for (let i = 0; i < optionsArr.length; i++) {
			const options = optionsArr[i];
			let found = false;
			// universal targets run the same bundle once per concrete environment;
			// the `"universal"` preset expands to web + node.
			let targets = [options.target];
			if (TestRunner.isUniversalTarget(options)) {
				targets = Array.isArray(options.target)
					? options.target
					: ["web", "node"];
			}

			for (const target of targets) {
				const runner = new TestRunner({
					target,
					outputDirectory,
					testMeta: {
						category: category.name,
						name: testName,
						round: i
					},
					testConfig,
					webpackOptions: options
				});
				setupRunner({
					runner,
					index: i,
					target
				});
				const bundlePaths = getBundlePaths(i, options, runner);
				if (bundlePaths) {
					const paths = Array.isArray(bundlePaths)
						? bundlePaths
						: [bundlePaths];
					for (const p of paths) {
						const normalized = path.isAbsolute(p)
							? p
							: p.startsWith("./")
								? p
								: `./${p}`;
						results.push(runner.require(outputDirectory, normalized));
					}

					if (!found) {
						found = true;
						filesCount++;
					}
				}
			}
		}
		return { filesCount, results };
	}

	/**
	 * @returns {ModuleRunner} module runners
	 */
	createModuleRunners() {
		return {
			cjs: this.createCjsRunner(),
			esm: this.createEsmRunner(),
			json: this.createJSONRunner(),
			raw: this.createRawRunner(),
			bytes: this.createBytesRunner(),
			css: this.createCssRunner()
		};
	}

	/**
	 * @returns {EXPECTED_ANY} globalContext
	 */
	createBaseGlobalContext() {
		const base = {
			console,
			expect,
			setTimeout,
			clearTimeout,
			setInterval,
			clearInterval
		};
		Object.assign(base, this.setupEnv());
		return base;
	}

	/**
	 * @param {EXPECTED_ANY} esmContext esm context
	 * @returns {EXPECTED_ANY} esm context
	 */
	mergeEsmContext(esmContext) {
		return Object.assign(this._esmContext, esmContext);
	}

	/**
	 * @returns {import("../../../lib/config/target").TargetProperties | false} target properties
	 */
	_resolveTargetProperties() {
		const target = this.target;
		const context = /** @type {string} */ (this.webpackOptions.context);

		if (/** @type {EXPECTED_ANY} */ (target) === false) return false;

		return typeof target === "string"
			? getTargetProperties(target, context)
			: getTargetsProperties(/** @type {string[]} */ (target), context);
	}

	/**
	 * @returns {boolean} whether target is web
	 */
	hasWebTarget() {
		return (
			this._targetProperties !== false &&
			(this._targetProperties.web === true ||
				this._targetProperties.webworker === true)
		);
	}

	/**
	 * @returns {boolean} whether target is node
	 */
	hasNodeTarget() {
		return (
			this._targetProperties !== false && this._targetProperties.node === true
		);
	}

	/**
	 * @returns {boolean} whether env is jsdom
	 */
	jsDom() {
		return this.testConfig.env === "jsdom" || this.hasWebTarget();
	}

	/**
	 * @returns {EXPECTED_ANY} moduleScope
	 */
	createBaseModuleScope() {
		const base = {
			console,
			expect,
			jest,
			nsObj: (/** @type {EXPECTED_ANY} */ m) => {
				Object.defineProperty(m, Symbol.toStringTag, {
					value: "Module"
				});
				return m;
			}
		};
		Object.assign(base, this._globalContext);
		if (this.jsDom()) {
			/** @type {EXPECTED_ANY} */ (base).window = this._globalContext;
			/** @type {EXPECTED_ANY} */ (base).self = this._globalContext;
		}
		return base;
	}

	/**
	 * @returns {EXPECTED_ANY} esm context
	 */
	createBaseEsmContext() {
		const base = {
			global,
			process,
			setTimeout,
			clearTimeout,
			setImmediate,
			URL,
			Buffer,
			TextEncoder: typeof TextEncoder !== "undefined" ? TextEncoder : undefined,
			TextDecoder: typeof TextDecoder !== "undefined" ? TextDecoder : undefined
		};
		return base;
	}

	/**
	 * @param {EXPECTED_ANY} globalContext global context
	 * @returns {EXPECTED_ANY} global context
	 */
	mergeGlobalContext(globalContext) {
		return Object.assign(this._globalContext, globalContext);
	}

	/**
	 * @param {EXPECTED_ANY} moduleScope module scope
	 * @returns {EXPECTED_ANY} module scope
	 */
	mergeModuleScope(moduleScope) {
		return Object.assign(this._moduleScope, moduleScope);
	}

	/**
	 * @param {string} currentDirectory current directory
	 * @param {string | string[]} module module
	 * @returns {ModuleInfo | undefined} module info
	 */
	_resolveModule(currentDirectory, module) {
		if (Array.isArray(module)) {
			return {
				origin: /** @type {string} */ (/** @type {EXPECTED_ANY} */ (module)),
				subPath: "",
				modulePath: path.join(currentDirectory, ".array-require.js"),
				content: `module.exports = (${module
					.map((arg) => `require(${JSON.stringify(`./${arg}`)})`)
					.join(", ")});`
			};
		}
		if (isRelativePath(module)) {
			return {
				origin: module,
				subPath: getSubPath(module),
				modulePath: path.join(currentDirectory, module),
				content: fs.readFileSync(path.join(currentDirectory, module), "utf8")
			};
		}
		if (path.isAbsolute(module)) {
			return {
				origin: module,
				subPath: "",
				modulePath: module,
				content: fs.readFileSync(module, "utf8")
			};
		}
		if (module.startsWith("https://test.")) {
			const realPath = urlToPath(module, currentDirectory);
			return {
				origin: module,
				subPath: "",
				modulePath: realPath,
				content: fs.readFileSync(realPath, "utf8")
			};
		}
	}

	/**
	 * @param {string} currentDirectory current directory
	 * @param {string | string[]} module module
	 * @param {RequireContext=} context context
	 * @param {Record<string, string>=} importAttributes import attributes
	 * @returns {EXPECTED_ANY} require result
	 */
	require(
		currentDirectory,
		module,
		context = /** @type {RequireContext} */ ({}),
		importAttributes = {}
	) {
		if (
			/** @type {EXPECTED_ANY} */ (this.testConfig).modules &&
			/** @type {string} */ (module) in
				/** @type {EXPECTED_ANY} */ (this.testConfig).modules
		) {
			return /** @type {EXPECTED_ANY} */ (this.testConfig).modules[
				/** @type {string} */ (module)
			];
		}
		if (this.testConfig.resolveModule) {
			module = this.testConfig.resolveModule(
				module,
				this.testMeta.round || 0,
				this.webpackOptions
			);
		}
		const moduleInfo = this._resolveModule(currentDirectory, module);
		if (!moduleInfo) {
			// node v12.2.0+ has Module.createRequire
			const rawRequire = Module.createRequire
				? Module.createRequire(currentDirectory)
				: require;
			const mod = /** @type {string} */ (module);
			return rawRequire(mod.startsWith("node:") ? mod.slice(5) : mod);
		}
		const { modulePath } = moduleInfo;
		if (importAttributes && importAttributes.type === "bytes") {
			return this._moduleRunners.bytes(moduleInfo, context);
		}
		if (
			modulePath.endsWith(".mjs") &&
			this.webpackOptions.experiments &&
			this.webpackOptions.experiments.outputModule
		) {
			return this._moduleRunners.esm(moduleInfo, context);
		}
		if (modulePath.endsWith(".json")) {
			return this._moduleRunners.json(moduleInfo, context);
		}
		if (modulePath.endsWith(".css")) {
			return this._moduleRunners.css(moduleInfo, context);
		}
		return this._moduleRunners.cjs(moduleInfo, context);
	}

	/**
	 * @returns {(moduleInfo: ModuleInfo, context: RequireContext) => EXPECTED_ANY} cjs runner
	 */
	createCjsRunner() {
		const requireCache = Object.create(null);
		return (moduleInfo, _context) => {
			const { modulePath, subPath, content } = moduleInfo;
			let _content = content;
			if (modulePath in requireCache) {
				return requireCache[modulePath].exports;
			}
			const mod = {
				exports: {},
				webpackTestSuiteModule: true
			};
			requireCache[modulePath] = mod;
			const moduleScope = {
				...this._moduleScope,
				require: Object.assign(
					this.require.bind(this, path.dirname(modulePath)),
					this.require
				),
				importScripts: (/** @type {string} */ url) => {
					expect(url).toMatch(/^https:\/\/test\.cases\/path\//);
					this.require(this.outputDirectory, urlToRelativePath(url));
				},
				module: mod,
				exports: mod.exports,
				__dirname: path.dirname(modulePath),
				__filename: modulePath,
				_globalAssign: { expect, it: this._moduleScope.it }
			};
			// Call again because some tests rely on `scope.module`
			if (this.testConfig.moduleScope) {
				this.testConfig.moduleScope(
					moduleScope,
					this.webpackOptions,
					this.target
				);
			}

			const args = Object.keys(moduleScope);
			const argValues = args.map((arg) => moduleScope[arg]);

			if (!this._runInNewContext) {
				_content = `Object.assign(global, _globalAssign); ${content}`;
			}
			const code = `(function(${args.join(", ")}) {${_content}\n})`;

			const fn = this._runInNewContext
				? vm.runInNewContext(code, this._globalContext, modulePath)
				: vm.runInThisContext(code, modulePath);
			const call = () => {
				fn.call(
					this.testConfig.nonEsmThis
						? this.testConfig.nonEsmThis(module)
						: mod.exports,
					...argValues
				);
			};

			if (this.hasWebTarget()) {
				this.withDocumentCurrentScript(call, subPath);
			} else {
				call();
			}
			return mod.exports;
		};
	}

	/**
	 * Run the code with document.currentScript
	 * @param {() => void} fn fn
	 * @param {string} current currentScript
	 */
	withDocumentCurrentScript(fn, current) {
		const document = this._moduleScope.document;
		if (document) {
			const CurrentScript = require("../../helpers/CurrentScript");

			const oldCurrentScript = document.currentScript;
			document.currentScript = new CurrentScript(current);
			try {
				fn();
			} finally {
				document.currentScript = oldCurrentScript;
			}
		} else {
			fn();
		}
	}

	/**
	 * @returns {(moduleInfo: ModuleInfo, context: RequireContext) => Promise<EXPECTED_ANY>} esm runner
	 */
	createEsmRunner() {
		const asModule = require("./asModule");

		const createEsmContext = () =>
			vm.createContext(
				{ ...this._moduleScope, ...this._esmContext },
				{
					name: "context for esm"
				}
			);

		/** @type {vm.Context | null} */
		let esmContext = null;

		/** @type {Map<string, vm.SourceTextModule>} */
		const esmCache = new Map();
		const { category, name, round } = this.testMeta;

		const testMetaStr = `${category}-${name}-${round || 0}`;
		const appendTestMeta = (/** @type {string} */ identifier) =>
			`${identifier}?${testMetaStr}`;

		/**
		 * @param {string} identifier identifier
		 * @param {string} content content
		 * @returns {vm.SourceTextModule} SourceTextModule
		 */
		const getModuleInstance = (identifier, content) => {
			let instance = esmCache.get(identifier);
			if (!instance) {
				instance = new vm.SourceTextModule(
					content,
					/** @type {EXPECTED_ANY} */ ({
						identifier: appendTestMeta(identifier),
						url: appendTestMeta(pathToFileURL(identifier).href),
						context: esmContext,
						initializeImportMeta: (
							/** @type {EXPECTED_ANY} */ meta,
							/** @type {EXPECTED_ANY} */ _module
						) => {
							meta.url = pathToFileURL(identifier).href;

							if (this.hasNodeTarget()) {
								meta.filename = identifier;
								meta.dirname = path.dirname(identifier);
							}
						},
						importModuleDynamically: async (
							/** @type {string} */ specifier,
							/** @type {vm.Module} */ module,
							/** @type {EXPECTED_ANY} */ importAttributes
						) => {
							const normalizedSpecifier = specifier.startsWith("file:")
								? `./${path.relative(
										path.dirname(identifier),
										fileURLToPath(specifier)
									)}`
								: specifier.replace(
										/https:\/\/example.com\/public\/path\//,
										"./"
									);

							const res = await this.require(
								path.dirname(identifier),
								normalizedSpecifier,
								{
									esmReturnStatus: ESModuleStatus.Evaluated
								},
								/** @type {Record<string, string>} */ (
									/** @type {EXPECTED_ANY} */ (importAttributes)
								)
							);

							return await asModule(
								res,
								module.context,
								undefined,
								/** @type {Record<string, string>} */ (
									/** @type {EXPECTED_ANY} */ (importAttributes)
								)
							);
						}
					})
				);
				esmCache.set(identifier, instance);
			}

			return instance;
		};

		return (moduleInfo, context) => {
			if (!vm.SourceTextModule) {
				throw new Error(
					"Running this test requires '--experimental-vm-modules'.\nRun with 'node --experimental-vm-modules node_modules/jest-cli/bin/jest'."
				);
			}

			// lazy bind esm context
			if (!esmContext) {
				esmContext = createEsmContext();
			}
			const { modulePath, content } = moduleInfo;
			const { esmReturnStatus } = context;

			const esm = getModuleInstance(modulePath, content);

			if (esmReturnStatus === ESModuleStatus.Unlinked)
				return Promise.resolve(esm);

			const link = async () => {
				await esm.link(
					async (specifier, referencingModule) =>
						// `linker` should return `vm.SourceTextModule`
						await asModule(
							await this.require(
								path.dirname(
									referencingModule.identifier ||
										fileURLToPath(
											/** @type {string} */ (
												/** @type {EXPECTED_ANY} */ (referencingModule).url
											)
										)
								),
								specifier,
								{ esmReturnStatus: ESModuleStatus.Unlinked }
							),
							referencingModule.context,
							{
								esmReturnStatus: ESModuleStatus.Unlinked
							}
						)
				);
			};

			const run = async () => {
				// Link module dependencies
				if (major === 10) {
					if (
						/** @type {EXPECTED_ANY} */ (esm).linkingStatus ===
						ESModuleStatus.Unlinked
					) {
						await link();
					}
					if (
						/** @type {EXPECTED_ANY} */ (esm).linkingStatus ===
						ESModuleStatus.Linked
					) {
						/** @type {EXPECTED_ANY} */ (esm).instantiate();
					}
				} else if (esm.status === ESModuleStatus.Unlinked) {
					await link();
				}

				// Evaluate the module
				await esm.evaluate();
				if (esmReturnStatus === ESModuleStatus.Evaluated) return esm;

				const ns = /** @type {EXPECTED_ANY} */ (esm.namespace);
				return ns.default && ns.default instanceof Promise ? ns.default : ns;
			};

			return run();
		};
	}

	/**
	 * @returns {(moduleInfo: ModuleInfo, context: RequireContext) => EXPECTED_ANY} json runner
	 */
	createJSONRunner() {
		return (moduleInfo) => JSON.parse(moduleInfo.content);
	}

	/**
	 * @returns {(moduleInfo: ModuleInfo, context: RequireContext) => EXPECTED_ANY} raw runner
	 */
	createRawRunner() {
		return (moduleInfo) => moduleInfo.content;
	}

	/**
	 * @returns {(moduleInfo: ModuleInfo, context: RequireContext) => EXPECTED_ANY} bytes runner
	 */
	createBytesRunner() {
		return (moduleInfo) => new Uint8Array(Buffer.from(moduleInfo.content));
	}

	/**
	 * @returns {(moduleInfo: ModuleInfo, context: RequireContext) => EXPECTED_ANY} css runner
	 */
	createCssRunner() {
		return (moduleInfo) => {
			if (this.hasWebTarget()) {
				const link = this._moduleScope.document.createElement("link");
				link.href = moduleInfo.origin;
				this._moduleScope.document.head.appendChild(link);
			}

			return moduleInfo.content;
		};
	}

	/**
	 * @returns {EXPECTED_ANY} env
	 */
	setupEnv() {
		if (this.jsDom()) {
			const outputDirectory = this.outputDirectory;

			const FakeDocument = require("../../helpers/FakeDocument");
			const createFakeWorker = require("../../helpers/createFakeWorker");
			const EventSource = require("../../helpers/EventSourceForNode");

			const document = new FakeDocument(outputDirectory);
			if (this.testConfig.evaluateScriptOnAttached) {
				document.onScript = (/** @type {string | undefined} */ src) => {
					this.require(
						outputDirectory,
						urlToRelativePath(/** @type {string} */ (src))
					);
				};
			}
			const fetch = async (/** @type {string | URL} */ url) => {
				try {
					// universal targets pass a `URL` (often `file:`) to fetch
					const filePath =
						url instanceof URL || String(url).startsWith("file:")
							? fileURLToPath(url)
							: urlToPath(String(url), this.outputDirectory);
					const buffer = await new Promise((resolve, reject) => {
						fs.readFile(filePath, (err, b) => (err ? reject(err) : resolve(b)));
					});
					// `instantiateStreaming` needs a real Response with a wasm mime type
					if (typeof Response !== "undefined") {
						const contentType = filePath.endsWith(".wasm")
							? "application/wasm"
							: filePath.endsWith(".json")
								? "application/json"
								: "text/plain";
						return new Response(buffer, {
							status: 200,
							headers: { "Content-Type": contentType }
						});
					}
					return {
						status: 200,
						ok: true,
						headers: { get: () => "application/wasm" },
						arrayBuffer: async () => buffer,
						text: async () => buffer.toString("utf8"),
						json: async () => JSON.parse(buffer.toString("utf8"))
					};
				} catch (/** @type {EXPECTED_ANY} */ err) {
					if (err.code === "ENOENT") {
						return typeof Response !== "undefined"
							? new Response(null, { status: 404 })
							: {
									status: 404,
									ok: false
								};
					}
					throw err;
				}
			};
			const env = {
				setTimeout,
				document,
				CSSStyleSheet: FakeDocument.CSSStyleSheet,
				location: {
					href: "https://test.cases/path/index.html",
					origin: "https://test.cases",
					toString() {
						return "https://test.cases/path/index.html";
					}
				},
				getComputedStyle: document.getComputedStyle.bind(document),
				Worker: createFakeWorker({
					outputDirectory
				}),
				URL,
				TextEncoder:
					typeof TextEncoder !== "undefined"
						? TextEncoder
						: // eslint-disable-next-line n/prefer-global/text-encoder
							require("util").TextEncoder,
				TextDecoder:
					typeof TextDecoder !== "undefined"
						? TextDecoder
						: // eslint-disable-next-line n/prefer-global/text-decoder
							require("util").TextDecoder,
				EventSource,
				clearTimeout,
				fetch
			};
			if (typeof Blob !== "undefined") {
				// node.js >= 18
				/** @type {EXPECTED_ANY} */ (env).Blob = Blob;
			}
			return env;
		}
		return {};
	}
}

module.exports.TestRunner = TestRunner;
