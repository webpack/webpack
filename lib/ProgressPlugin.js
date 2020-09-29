/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const validateOptions = require("schema-utils");
const schema = require("../schemas/plugins/ProgressPlugin.json");
const Compiler = require("./Compiler");
const MultiCompiler = require("./MultiCompiler");
const NormalModule = require("./NormalModule");
const { contextify } = require("./util/identifier");

/** @typedef {import("../declarations/plugins/ProgressPlugin").HandlerFunction} HandlerFunction */
/** @typedef {import("../declarations/plugins/ProgressPlugin").ProgressPluginArgument} ProgressPluginArgument */
/** @typedef {import("../declarations/plugins/ProgressPlugin").ProgressPluginOptions} ProgressPluginOptions */

const median3 = (a, b, c) => {
	return a + b + c - Math.max(a, b, c) - Math.min(a, b, c);
};

const createDefaultHandler = (profile, logger) => {
	/** @type {{ value: string, time: number }[]} */
	const lastStateInfo = [];

	const defaultHandler = (percentage, msg, ...args) => {
		if (profile) {
			if (percentage === 0) {
				lastStateInfo.length = 0;
			}
			const fullState = [msg, ...args];
			const state = fullState.map(s => s.replace(/\d+\/\d+ /g, ""));
			const now = Date.now();
			const len = Math.max(state.length, lastStateInfo.length);
			for (let i = len; i >= 0; i--) {
				const stateItem = i < state.length ? state[i] : undefined;
				const lastStateItem =
					i < lastStateInfo.length ? lastStateInfo[i] : undefined;
				if (lastStateItem) {
					if (stateItem !== lastStateItem.value) {
						const diff = now - lastStateItem.time;
						if (lastStateItem.value) {
							let reportState = lastStateItem.value;
							if (i > 0) {
								reportState = lastStateInfo[i - 1].value + " > " + reportState;
							}
							const stateMsg = `${" | ".repeat(i)}${diff} ms ${reportState}`;
							const d = diff;
							// This depends on timing so we ignore it for coverage
							/* istanbul ignore next */
							{
								if (d > 10000) {
									logger.error(stateMsg);
								} else if (d > 1000) {
									logger.warn(stateMsg);
								} else if (d > 10) {
									logger.info(stateMsg);
								} else if (d > 5) {
									logger.log(stateMsg);
								} else {
									logger.debug(stateMsg);
								}
							}
						}
						if (stateItem === undefined) {
							lastStateInfo.length = i;
						} else {
							lastStateItem.value = stateItem;
							lastStateItem.time = now;
							lastStateInfo.length = i + 1;
						}
					}
				} else {
					lastStateInfo[i] = {
						value: stateItem,
						time: now
					};
				}
			}
		}
		logger.status(`${Math.floor(percentage * 100)}%`, msg, ...args);
		if (percentage === 1 || (!msg && args.length === 0)) logger.status();
	};

	return defaultHandler;
};

/**
 * @callback ReportProgress
 * @param {number} p
 * @param {...string[]} [args]
 * @returns {void}
 */

/** @type {WeakMap<Compiler,ReportProgress>} */
const progressReporters = new WeakMap();

class ProgressPlugin {
	/**
	 * @param {Compiler} compiler the current compiler
	 * @returns {ReportProgress} a progress reporter, if any
	 */
	static getReporter(compiler) {
		return progressReporters.get(compiler);
	}

	/**
	 * @param {ProgressPluginArgument} options options
	 */
	constructor(options) {
		if (typeof options === "function") {
			options = {
				handler: options
			};
		}

		options = options || {};
		validateOptions(schema, options, {
			name: "Progress Plugin",
			baseDataPath: "options"
		});
		options = { ...ProgressPlugin.defaultOptions, ...options };

		this.profile = options.profile;
		this.handler = options.handler;
		this.modulesCount = options.modulesCount;
		this.dependenciesCount = options.dependenciesCount;
		this.showEntries = options.entries;
		this.showModules = options.modules;
		this.showDependencies = options.dependencies;
		this.showActiveModules = options.activeModules;
		this.percentBy = options.percentBy;
	}

	/**
	 * @param {Compiler | MultiCompiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const handler =
			this.handler ||
			createDefaultHandler(
				this.profile,
				compiler.getInfrastructureLogger("webpack.Progress")
			);
		if (compiler instanceof MultiCompiler) {
			this._applyOnMultiCompiler(compiler, handler);
		} else if (compiler instanceof Compiler) {
			this._applyOnCompiler(compiler, handler);
		}
	}

	/**
	 * @param {MultiCompiler} compiler webpack multi-compiler
	 * @param {HandlerFunction} handler function that executes for every progress step
	 * @returns {void}
	 */
	_applyOnMultiCompiler(compiler, handler) {
		const states = compiler.compilers.map(
			() => /** @type {[number, ...string[]]} */ ([0])
		);
		compiler.compilers.forEach((compiler, idx) => {
			new ProgressPlugin((p, msg, ...args) => {
				states[idx] = [p, msg, ...args];
				let sum = 0;
				for (const [p] of states) sum += p;
				handler(sum / states.length, `[${idx}] ${msg}`, ...args);
			}).apply(compiler);
		});
	}

	/**
	 * @param {Compiler} compiler webpack compiler
	 * @param {HandlerFunction} handler function that executes for every progress step
	 * @returns {void}
	 */
	_applyOnCompiler(compiler, handler) {
		const showEntries = this.showEntries;
		const showModules = this.showModules;
		const showDependencies = this.showDependencies;
		const showActiveModules = this.showActiveModules;
		let lastActiveModule = "";
		let currentLoader = "";
		let lastModulesCount = 0;
		let lastDependenciesCount = 0;
		let lastEntriesCount = 0;
		let modulesCount = 0;
		let dependenciesCount = 0;
		let entriesCount = 1;
		let doneModules = 0;
		let doneDependencies = 0;
		let doneEntries = 0;
		const activeModules = new Set();
		let lastUpdate = 0;

		const updateThrottled = () => {
			if (lastUpdate + 500 < Date.now()) update();
		};

		const update = () => {
			/** @type {string[]} */
			const items = [];
			const percentByModules =
				doneModules /
				Math.max(lastModulesCount || this.modulesCount, modulesCount);
			const percentByEntries =
				doneEntries /
				Math.max(lastEntriesCount || this.dependenciesCount, entriesCount);
			const percentByDependencies =
				doneDependencies / Math.max(lastDependenciesCount, dependenciesCount);
			let percentageFactor;

			switch (this.percentBy) {
				case "entries":
					percentageFactor = percentByEntries;
					break;
				case "dependencies":
					percentageFactor = percentByDependencies;
					break;
				case "modules":
					percentageFactor = percentByModules;
					break;
				default:
					percentageFactor = median3(
						percentByModules,
						percentByEntries,
						percentByDependencies
					);
			}

			const percentage = 0.1 + percentageFactor * 0.55;

			if (currentLoader) {
				items.push(
					`import loader ${contextify(
						compiler.context,
						currentLoader,
						compiler.root
					)}`
				);
			} else {
				const statItems = [];
				if (showEntries) {
					statItems.push(`${doneEntries}/${entriesCount} entries`);
				}
				if (showDependencies) {
					statItems.push(
						`${doneDependencies}/${dependenciesCount} dependencies`
					);
				}
				if (showModules) {
					statItems.push(`${doneModules}/${modulesCount} modules`);
				}
				if (showActiveModules) {
					statItems.push(`${activeModules.size} active`);
				}
				if (statItems.length > 0) {
					items.push(statItems.join(" "));
				}
				if (showActiveModules) {
					items.push(lastActiveModule);
				}
			}
			handler(percentage, "building", ...items);
			lastUpdate = Date.now();
		};

		const factorizeAdd = () => {
			dependenciesCount++;
			if (dependenciesCount % 100 === 0) updateThrottled();
		};

		const factorizeDone = () => {
			doneDependencies++;
			if (doneDependencies % 100 === 0) updateThrottled();
		};

		const moduleAdd = () => {
			modulesCount++;
			if (modulesCount % 100 === 0) updateThrottled();
		};

		const moduleBuild = module => {
			if (showActiveModules) {
				const ident = module.identifier();
				if (ident) {
					activeModules.add(ident);
					lastActiveModule = ident;
					update();
				}
			}
		};

		const entryAdd = (entry, options) => {
			entriesCount++;
			if (entriesCount % 10 === 0) updateThrottled();
		};

		const moduleDone = module => {
			doneModules++;
			if (showActiveModules) {
				const ident = module.identifier();
				if (ident) {
					activeModules.delete(ident);
					if (lastActiveModule === ident) {
						lastActiveModule = "";
						for (const m of activeModules) {
							lastActiveModule = m;
						}
						update();
						return;
					}
				}
			}
			if (doneModules % 100 === 0) updateThrottled();
		};

		const entryDone = (entry, options) => {
			doneEntries++;
			update();
		};

		const cache = compiler
			.getCache("ProgressPlugin")
			.getItemCache("counts", null);

		let cacheGetPromise;

		compiler.hooks.beforeCompile.tap("ProgressPlugin", () => {
			if (!cacheGetPromise) {
				cacheGetPromise = cache.getPromise().then(
					data => {
						if (data) {
							lastModulesCount = lastModulesCount || data.modulesCount;
							lastDependenciesCount =
								lastDependenciesCount || data.dependenciesCount;
						}
						return data;
					},
					err => {
						// Ignore error
					}
				);
			}
		});

		compiler.hooks.afterCompile.tapPromise("ProgressPlugin", compilation => {
			return cacheGetPromise.then(async oldData => {
				if (
					!oldData ||
					oldData.modulesCount !== modulesCount ||
					oldData.dependenciesCount !== dependenciesCount
				) {
					await cache.storePromise({ modulesCount, dependenciesCount });
				}
			});
		});

		compiler.hooks.compilation.tap("ProgressPlugin", compilation => {
			if (compilation.compiler.isChild()) return;
			lastModulesCount = modulesCount;
			lastEntriesCount = entriesCount;
			lastDependenciesCount = dependenciesCount;
			modulesCount = dependenciesCount = entriesCount = 0;
			doneModules = doneDependencies = doneEntries = 0;

			compilation.factorizeQueue.hooks.added.tap(
				"ProgressPlugin",
				factorizeAdd
			);
			compilation.factorizeQueue.hooks.result.tap(
				"ProgressPlugin",
				factorizeDone
			);

			compilation.addModuleQueue.hooks.added.tap("ProgressPlugin", moduleAdd);
			compilation.processDependenciesQueue.hooks.result.tap(
				"ProgressPlugin",
				moduleDone
			);

			compilation.hooks.buildModule.tap("ProgressPlugin", moduleBuild);

			compilation.hooks.addEntry.tap("ProgressPlugin", entryAdd);
			compilation.hooks.failedEntry.tap("ProgressPlugin", entryDone);
			compilation.hooks.succeedEntry.tap("ProgressPlugin", entryDone);

			// avoid dynamic require if bundled with webpack
			// @ts-expect-error
			if (typeof __webpack_require__ !== "function") {
				const requiredLoaders = new Set();
				NormalModule.getCompilationHooks(compilation).beforeLoaders.tap(
					"ProgressPlugin",
					loaders => {
						for (const loader of loaders) {
							if (
								loader.type !== "module" &&
								!requiredLoaders.has(loader.loader)
							) {
								requiredLoaders.add(loader.loader);
								currentLoader = loader.loader;
								update();
								require(loader.loader);
							}
						}
						if (currentLoader) {
							currentLoader = "";
							update();
						}
					}
				);
			}

			const hooks = {
				finishModules: "finish module graph",
				seal: "plugins",
				optimizeDependencies: "dependencies optimization",
				afterOptimizeDependencies: "after dependencies optimization",
				beforeChunks: "chunk graph",
				afterChunks: "after chunk graph",
				optimize: "optimizing",
				optimizeModules: "module optimization",
				afterOptimizeModules: "after module optimization",
				optimizeChunks: "chunk optimization",
				afterOptimizeChunks: "after chunk optimization",
				optimizeTree: "module and chunk tree optimization",
				afterOptimizeTree: "after module and chunk tree optimization",
				optimizeChunkModules: "chunk modules optimization",
				afterOptimizeChunkModules: "after chunk modules optimization",
				reviveModules: "module reviving",
				beforeModuleIds: "before module ids",
				moduleIds: "module ids",
				optimizeModuleIds: "module id optimization",
				afterOptimizeModuleIds: "module id optimization",
				reviveChunks: "chunk reviving",
				beforeChunkIds: "before chunk ids",
				chunkIds: "chunk ids",
				optimizeChunkIds: "chunk id optimization",
				afterOptimizeChunkIds: "after chunk id optimization",
				recordModules: "record modules",
				recordChunks: "record chunks",
				beforeModuleHash: "module hashing",
				beforeCodeGeneration: "code generation",
				beforeRuntimeRequirements: "runtime requirements",
				beforeHash: "hashing",
				afterHash: "after hashing",
				recordHash: "record hash",
				beforeModuleAssets: "module assets processing",
				beforeChunkAssets: "chunk assets processing",
				processAssets: "asset processing",
				afterProcessAssets: "after asset optimization",
				record: "recording",
				afterSeal: "after seal"
			};
			const numberOfHooks = Object.keys(hooks).length;
			Object.keys(hooks).forEach((name, idx) => {
				const title = hooks[name];
				const percentage = (idx / numberOfHooks) * 0.25 + 0.7;
				compilation.hooks[name].intercept({
					name: "ProgressPlugin",
					call() {
						handler(percentage, "sealing", title);
					},
					done() {
						progressReporters.set(compiler, undefined);
						handler(percentage, "sealing", title);
					},
					result() {
						handler(percentage, "sealing", title);
					},
					error() {
						handler(percentage, "sealing", title);
					},
					tap(tap) {
						// p is percentage from 0 to 1
						// args is any number of messages in a hierarchical matter
						progressReporters.set(compilation.compiler, (p, ...args) => {
							handler(percentage, "sealing", title, tap.name, ...args);
						});
						handler(percentage, "sealing", title, tap.name);
					}
				});
			});
		});
		compiler.hooks.make.intercept({
			name: "ProgressPlugin",
			call() {
				handler(0.1, "building");
			},
			done() {
				handler(0.65, "building");
			}
		});
		const interceptHook = (hook, progress, category, name) => {
			hook.intercept({
				name: "ProgressPlugin",
				call() {
					handler(progress, category, name);
				},
				done() {
					progressReporters.set(compiler, undefined);
					handler(progress, category, name);
				},
				result() {
					handler(progress, category, name);
				},
				error() {
					handler(progress, category, name);
				},
				tap(tap) {
					progressReporters.set(compiler, (p, ...args) => {
						handler(progress, category, name, tap.name, ...args);
					});
					handler(progress, category, name, tap.name);
				}
			});
		};
		compiler.cache.hooks.endIdle.intercept({
			name: "ProgressPlugin",
			call() {
				handler(0, "");
			}
		});
		interceptHook(compiler.cache.hooks.endIdle, 0.01, "cache", "end idle");
		compiler.hooks.initialize.intercept({
			name: "ProgressPlugin",
			call() {
				handler(0, "");
			}
		});
		interceptHook(compiler.hooks.initialize, 0.01, "setup", "initialize");
		interceptHook(compiler.hooks.beforeRun, 0.02, "setup", "before run");
		interceptHook(compiler.hooks.run, 0.03, "setup", "run");
		interceptHook(compiler.hooks.watchRun, 0.03, "setup", "watch run");
		interceptHook(
			compiler.hooks.normalModuleFactory,
			0.04,
			"setup",
			"normal module factory"
		);
		interceptHook(
			compiler.hooks.contextModuleFactory,
			0.05,
			"setup",
			"context module factory"
		);
		interceptHook(
			compiler.hooks.beforeCompile,
			0.06,
			"setup",
			"before compile"
		);
		interceptHook(compiler.hooks.compile, 0.07, "setup", "compile");
		interceptHook(compiler.hooks.thisCompilation, 0.08, "setup", "compilation");
		interceptHook(compiler.hooks.compilation, 0.09, "setup", "compilation");
		interceptHook(compiler.hooks.finishMake, 0.69, "building", "finish");
		interceptHook(compiler.hooks.emit, 0.95, "emitting", "emit");
		interceptHook(compiler.hooks.afterEmit, 0.98, "emitting", "after emit");
		interceptHook(compiler.hooks.done, 0.99, "done", "plugins");
		compiler.hooks.done.intercept({
			name: "ProgressPlugin",
			done() {
				handler(0.99, "");
			}
		});
		interceptHook(
			compiler.cache.hooks.storeBuildDependencies,
			0.99,
			"cache",
			"store build dependencies"
		);
		interceptHook(compiler.cache.hooks.shutdown, 0.99, "cache", "shutdown");
		interceptHook(compiler.cache.hooks.beginIdle, 0.99, "cache", "begin idle");
		interceptHook(
			compiler.hooks.watchClose,
			0.99,
			"end",
			"closing watch compilation"
		);
		compiler.cache.hooks.beginIdle.intercept({
			name: "ProgressPlugin",
			done() {
				handler(1, "");
			}
		});
		compiler.cache.hooks.shutdown.intercept({
			name: "ProgressPlugin",
			done() {
				handler(1, "");
			}
		});
	}
}

ProgressPlugin.defaultOptions = {
	profile: false,
	modulesCount: 5000,
	dependenciesCount: 10000,
	modules: true,
	dependencies: true,
	activeModules: false,
	entries: true
};

module.exports = ProgressPlugin;
