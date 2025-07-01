const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { pathToFileURL, fileURLToPath } = require("url");

/**
 * @param {string} path
 * @returns {string}
 */
const getSubPath = path => {
	let subPath = "";
	const lastSlash = path.lastIndexOf("/");
	let firstSlash = path.indexOf("/");
	if (lastSlash !== -1 && firstSlash !== lastSlash) {
		if (firstSlash !== -1) {
			let next = path.indexOf("/", firstSlash + 1);
			let dir = path.slice(firstSlash + 1, next);

			while (dir === ".") {
				firstSlash = next;
				next = path.indexOf("/", firstSlash + 1);
				dir = path.slice(firstSlash + 1, next);
			}
		}
		subPath = path.slice(firstSlash + 1, lastSlash + 1);
	}
	return subPath;
};

/**
 * @param {string} path
 * @returns {boolean}
 */
const isRelativePath = path => /^\.\.?\//.test(path);

/**
 * @param {string} url
 * @param {string} outputDirectory
 * @returns {string}
 */
const urlToPath = (url, outputDirectory) => {
	if (url.startsWith("https://test.cases/path/")) url = url.slice(24);
	else if (url.startsWith("https://test.cases/")) url = url.slice(19);
	return path.resolve(outputDirectory, `./${url}`);
};

/**
 * @param {string} url
 * @returns {string}
 */
const urlToRelativePath = url => {
	if (url.startsWith("https://test.cases/path/")) url = url.slice(24);
	else if (url.startsWith("https://test.cases/")) url = url.slice(19);
	return `./${url}`;
};

/**
 * @typedef {Object} TestMeta
 * @property {string} category
 * @property {string} name
 * @property {"jsdom"} [env]
 * @property {number} [round]
 */

/**
 * @typedef {Object} TestConfig
 * @property {Function} [resolveModule]
 * @property {Function} [moduleScope]
 * @property {Function} [nonEsmThis]
 * @property {boolean} [evaluateScriptOnAttached]
 */

/**
 * @typedef {Object} TestRunnerOptions
 * @property {string|string[]} target
 * @property {string} outputDirectory
 * @property {TestMeta} testMeta
 * @property {TestConfig} testConfig
 * @property {EXPECTED_ANY} webpackOptions
 */

/**
 * @typedef {Object} ModuleInfo
 * @property {string} subPath
 * @property {string} modulePath
 * @property {string} content
 */

/**
 * @typedef {Object} RequireContext
 * @property {"unlinked"|"evaluated"} esmMode
 */

/**
 * @typedef {Object} ModuleRunner
 * @property {(moduleInfo: ModuleInfo, context: RequireContext) => EXPECTED_ANY} cjs
 * @property {(moduleInfo: ModuleInfo, context: RequireContext) => Promise<EXPECTED_ANY>} esm
 * @property {(moduleInfo: ModuleInfo, context: RequireContext) => EXPECTED_ANY} json
 * @property {(moduleInfo: ModuleInfo, context: RequireContext) => EXPECTED_ANY} raw
 */

class TestRunner {
	/**
	 * @param {TestRunnerOptions} options
	 */
	constructor({
		target,
		outputDirectory,
		testMeta,
		testConfig,
		webpackOptions
	}) {
		this.target = target;
		this.outputDirectory = outputDirectory;
		this.testConfig = testConfig || {};
		this.testMeta = testMeta || {};
		this.webpackOptions = webpackOptions || {};
		this._runInNewContext = this.isTargetWeb();
		this._globalContext = this.createBaseGlobalContext();
		this._moduleScope = this.createBaseModuleScope();
		this._moduleRunners = this.createModuleRunners();
	}

	/**
	 * @returns {ModuleRunner}
	 */
	createModuleRunners() {
		return {
			cjs: this.createCjsRunner(),
			esm: this.createEsmRunner(),
			json: this.createJSONRunner(),
			raw: this.createRawRunner()
		};
	}
	/**
	 * @returns {EXPECTED_ANY} globalContext
	 */
	createBaseGlobalContext() {
		let base = { console, expect, setTimeout, clearTimeout };
		Object.assign(base, this.setupEnv());
		return base;
	}
	/**
	 * @returns {boolean}
	 */
	isTargetWeb() {
		return (
			this.target === "web" ||
			this.target === "webworker" ||
			(Array.isArray(this.target) &&
				(this.target.includes("web") || this.target.includes("webworker")))
		);
	}
	/**
	 * @returns {boolean}
	 */
	jsDom() {
		return this.testMeta.env === "jsdom" || this.isTargetWeb();
	}
	/**
	 * @returns {EXPECTED_ANY} moduleScope
	 */
	createBaseModuleScope() {
		let base = {
			console,
			expect,
			jest,
			nsObj: m => {
				Object.defineProperty(m, Symbol.toStringTag, {
					value: "Module"
				});
				return m;
			}
		};
		if (this.jsDom()) {
			Object.assign(base, this._globalContext);
			base.window = this._globalContext;
			base.self = this._globalContext;
		}
		return base;
	}
	/**
	 * @param {EXPECTED_ANY} globalContext
	 * @returns {EXPECTED_ANY}
	 */
	mergeGlobalContext(globalContext) {
		return Object.assign(this._globalContext, globalContext);
	}
	/**
	 * @param {EXPECTED_ANY} moduleScope
	 * @returns {EXPECTED_ANY}
	 */
	mergeModuleScope(moduleScope) {
		return Object.assign(this._moduleScope, moduleScope);
	}
	/**
	 * @param {string} currentDirectory
	 * @param {string|string[]} module
	 * @returns {ModuleInfo}
	 */
	_resolveModule(currentDirectory, module) {
		if (Array.isArray(module)) {
			return {
				subPath: "",
				modulePath: path.join(currentDirectory, ".array-require.js"),
				content: `module.exports = (${module
					.map(arg => `require(${JSON.stringify(`./${arg}`)})`)
					.join(", ")});`
			};
		}
		if (isRelativePath(module)) {
			return {
				subPath: getSubPath(module),
				modulePath: path.join(currentDirectory, module),
				content: fs.readFileSync(path.join(currentDirectory, module), "utf-8")
			};
		}
		if (path.isAbsolute(module)) {
			return {
				subPath: "",
				modulePath: module,
				content: fs.readFileSync(module, "utf-8")
			};
		}
		if (module.startsWith("https://test.")) {
			const realPath = urlToPath(module, currentDirectory);
			return {
				subPath: "",
				modulePath: realPath,
				content: fs.readFileSync(realPath, "utf-8")
			};
		}
	}

	/**
	 * @param {string} currentDirectory
	 * @param {string|string[]} module
	 * @param {RequireContext} [context={}]
	 * @returns {EXPECTED_ANY}
	 */
	require(currentDirectory, module, context = {}) {
		if (this.testConfig.modules && module in this.testConfig.modules) {
			return this.testConfig.modules[module];
		}
		if (this.testConfig.resolveModule) {
			module = this.testConfig.resolveModule(
				module,
				this.testMeta.round || 0,
				this.webpackOptions
			);
		}
		let moduleInfo = this._resolveModule(currentDirectory, module);
		if (!moduleInfo) {
			return require(module.startsWith("node:") ? module.slice(5) : module);
		}
		const { modulePath } = moduleInfo;
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
		if (["css"].includes(modulePath.split(".").pop())) {
			return this._moduleRunners.raw(moduleInfo, context);
		}
		return this._moduleRunners.cjs(moduleInfo, context);
	}
	/**
	 * @returns {(moduleInfo: ModuleInfo, context: RequireContext) => EXPECTED_ANY}
	 */
	createCjsRunner() {
		const requireCache = Object.create(null);
		return (moduleInfo, context) => {
			const { modulePath, subPath, content } = moduleInfo;
			let _content = content;
			if (modulePath in requireCache) {
				return requireCache[modulePath].exports;
			}
			const mod = {
				exports: {}
			};
			requireCache[modulePath] = mod;
			const moduleScope = {
				...this._moduleScope,
				require: this.require.bind(this, path.dirname(modulePath)),
				importScripts: url => {
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
				this.testConfig.moduleScope(moduleScope, this.webpackOptions);
			}
			if (!this._runInNewContext)
				_content = `Object.assign(global, _globalAssign); ${content}`;
			const args = Object.keys(moduleScope);
			const argValues = args.map(arg => moduleScope[arg]);
			const code = `(function(${args.join(", ")}) {${_content}\n})`;
			const document = this._moduleScope.document;
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
			if (document) {
				const CurrentScript = require("../helpers/CurrentScript");
				const oldCurrentScript = document.currentScript;
				document.currentScript = new CurrentScript(subPath);
				try {
					call();
				} finally {
					document.currentScript = oldCurrentScript;
				}
			} else {
				call();
			}
			return mod.exports;
		};
	}
	/**
	 * @returns {(moduleInfo: ModuleInfo, context: RequireContext) => Promise<EXPECTED_ANY>}
	 */
	createEsmRunner() {
		const esmCache = new Map();
		const { category, name, round } = this.testMeta;
		const esmIdentifier = `${category.name}-${name}-${round || 0}`;
		let esmContext = null;
		return (moduleInfo, context) => {
			const asModule = require("../helpers/asModule");
			// lazy bind esm context
			if (!esmContext) {
				esmContext = vm.createContext(this._moduleScope, {
					name: "context for esm"
				});
			}
			const { modulePath, subPath, content } = moduleInfo;
			const { esmMode } = context;
			if (!vm.SourceTextModule)
				throw new Error(
					"Running this test requires '--experimental-vm-modules'.\nRun with 'node --experimental-vm-modules node_modules/jest-cli/bin/jest'."
				);
			let esm = esmCache.get(modulePath);
			if (!esm) {
				esm = new vm.SourceTextModule(content, {
					identifier: `${esmIdentifier}-${modulePath}`,
					url: `${pathToFileURL(modulePath).href}?${esmIdentifier}`,
					context: esmContext,
					initializeImportMeta: (meta, module) => {
						meta.url = pathToFileURL(modulePath).href;
					},
					importModuleDynamically: async (specifier, module) => {
						const normalizedSpecifier = specifier.startsWith("file:")
							? `./${path.relative(
									path.dirname(modulePath),
									fileURLToPath(specifier)
								)}`
							: specifier.replace(
									/https:\/\/example.com\/public\/path\//,
									"./"
								);
						const result = await this.require(
							path.dirname(modulePath),
							normalizedSpecifier,
							{
								esmMode: "evaluated"
							}
						);
						return await asModule(result, module.context);
					}
				});
				esmCache.set(modulePath, esm);
			}
			if (esmMode === "unlinked") return esm;
			return (async () => {
				if (esmMode === "unlinked") return esm;
				await esm.link(
					async (specifier, referencingModule) =>
						await asModule(
							await this.require(
								path.dirname(
									referencingModule.identifier
										? referencingModule.identifier.slice(
												esmIdentifier.length + 1
											)
										: fileURLToPath(referencingModule.url)
								),
								specifier,
								{ esmMode: "unlinked" }
							),
							referencingModule.context,
							true
						)
				);
				// node.js 10 needs instantiate
				if (esm.instantiate) esm.instantiate();
				await esm.evaluate();
				if (esmMode === "evaluated") return esm;
				const ns = esm.namespace;
				return ns.default && ns.default instanceof Promise ? ns.default : ns;
			})();
		};
	}
	createJSONRunner() {
		return moduleInfo => {
			return JSON.parse(moduleInfo.content);
		};
	}
	createRawRunner() {
		return moduleInfo => {
			return moduleInfo.content;
		};
	}
	setupEnv() {
		if (this.jsDom()) {
			const outputDirectory = this.outputDirectory;
			const FakeDocument = require("../helpers/FakeDocument");
			const createFakeWorker = require("../helpers/createFakeWorker");
			const EventSource = require("../helpers/EventSourceForNode");
			const document = new FakeDocument(outputDirectory);
			if (this.testConfig.evaluateScriptOnAttached) {
				document.onScript = src => {
					this.require(outputDirectory, urlToRelativePath(src));
				};
			}
			const fetch = async url => {
				try {
					const buffer = await new Promise((resolve, reject) => {
						fs.readFile(urlToPath(url, this.outputDirectory), (err, b) =>
							err ? reject(err) : resolve(b)
						);
					});
					return {
						status: 200,
						ok: true,
						json: async () => JSON.parse(buffer.toString("utf-8"))
					};
				} catch (err) {
					if (err.code === "ENOENT") {
						return {
							status: 404,
							ok: false
						};
					}
					throw err;
				}
			};
			let env = {
				setTimeout,
				document,
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
				EventSource,
				clearTimeout,
				fetch
			};
			if (typeof Blob !== "undefined") {
				// node.js >= 18
				env.Blob = Blob;
			}
			return env;
		}
		return {};
	}
}

module.exports.TestRunner = TestRunner;
