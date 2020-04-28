/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const validateOptions = require("schema-utils");
const schema = require("../schemas/plugins/ProgressPlugin.json");
const Compiler = require("./Compiler");
const MultiCompiler = require("./MultiCompiler");

/** @typedef {import("../declarations/plugins/ProgressPlugin").HandlerFunction} HandlerFunction */
/** @typedef {import("../declarations/plugins/ProgressPlugin").ProgressPluginArgument} ProgressPluginArgument */
/** @typedef {import("../declarations/plugins/ProgressPlugin").ProgressPluginOptions} ProgressPluginOptions */

const median3 = (a, b, c) => {
	return a + b + c - Math.max(a, b, c) - Math.min(a, b, c);
};

const createDefaultHandler = (profile, logger) => {
	/** @type {{ value: string, time: number, alreadyReported: number }[]} */
	const lastStateInfo = [];

	const defaultHandler = (percentage, msg, ...args) => {
		if (profile) {
			if (percentage === 0) {
				lastStateInfo.length = 0;
			}
			const fullState = [msg, ...args];
			const state = fullState.map((_, i) =>
				fullState.slice(0, i + 1).join(" ")
			);
			const now = Date.now();
			const len = Math.max(state.length, lastStateInfo.length);
			for (let i = 0; i < len; i++) {
				const stateItem = i < state.length ? state[i] : undefined;
				const lastStateItem =
					i < lastStateInfo.length ? lastStateInfo[i] : undefined;
				if (lastStateItem) {
					if (stateItem !== lastStateItem.value) {
						const alreadyReported = lastStateItem.alreadyReported;
						const diff = now - lastStateItem.time;
						const stateMsg = alreadyReported
							? `${diff} ms (-${alreadyReported} ms) ${lastStateItem.value}`
							: `${diff} ms ${lastStateItem.value}`;
						const d = diff - alreadyReported;
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
						if (stateItem === undefined) {
							lastStateInfo[i] = undefined;
						} else {
							lastStateItem.value = stateItem;
							lastStateItem.time = now;
							lastStateItem.alreadyReported = 0;
						}
						lastStateInfo.length = i + 1;
						for (let j = 0; j < i; j++) {
							lastStateInfo[j].alreadyReported += diff;
						}
						break;
					}
				} else {
					lastStateInfo[i] = {
						value: stateItem,
						time: now,
						alreadyReported: 0
					};
				}
			}
		}
		logger.status(`${Math.floor(percentage * 100)}%`, msg, ...args);
		if (percentage === 1) logger.status();
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
		let lastModulesCount = this.modulesCount;
		let lastDependenciesCount = this.dependenciesCount;
		let lastEntriesCount = 0;
		let modulesCount = 0;
		let dependenciesCount = 0;
		let entriesCount = 1;
		let doneModules = 0;
		let doneDependencies = 0;
		let doneEntries = 0;
		const activeModules = new Set();
		let lastUpdate = 0;
		const cacheName = `${compiler.compilerPath}/progress-plugin`;

		const updateThrottled = () => {
			if (lastUpdate + 500 < Date.now()) update();
		};

		const update = () => {
			/** @type {string[]} */
			const items = [];
			const percentByModules =
				doneModules / Math.max(lastModulesCount, modulesCount);
			const percentByEntries =
				doneEntries / Math.max(lastEntriesCount, entriesCount);
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

			const percentage = 0.1 + percentageFactor * 0.6;

			if (showEntries) {
				items.push(`${doneEntries}/${entriesCount} entries`);
			}
			if (showDependencies) {
				items.push(`${doneDependencies}/${dependenciesCount} dependencies`);
			}
			if (showModules) {
				items.push(`${doneModules}/${modulesCount} modules`);
			}
			if (showActiveModules) {
				items.push(`${activeModules.size} active`);
				items.push(lastActiveModule);
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

		compiler.hooks.beforeCompile.tapAsync(
			"ProgressPlugin",
			(params, callback) => {
				compiler.cache.get(cacheName, null, (err, data) => {
					if (err) {
						return callback(err);
					}

					if (data) {
						lastModulesCount = lastModulesCount || data.modulesCount;
						lastDependenciesCount =
							lastDependenciesCount || data.dependenciesCount;
					}

					callback();
				});
			}
		);

		compiler.hooks.afterCompile.tapAsync(
			"ProgressPlugin",
			(compilation, callback) => {
				compiler.cache.store(
					cacheName,
					null,
					{ modulesCount, dependenciesCount },
					callback
				);
			}
		);

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

			const hooks = {
				finishModules: "finish module graph",
				seal: "sealing",
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
				additionalChunkAssets: "additional chunk assets processing",
				record: "recording",
				additionalAssets: "additional asset processing",
				optimizeChunkAssets: "chunk asset optimization",
				afterOptimizeChunkAssets: "after chunk asset optimization",
				optimizeAssets: "asset optimization",
				afterOptimizeAssets: "after asset optimization",
				finishAssets: "finish assets",
				afterFinishAssets: "after finish assets",
				afterSeal: "after seal"
			};
			const numberOfHooks = Object.keys(hooks).length;
			Object.keys(hooks).forEach((name, idx) => {
				const title = hooks[name];
				const percentage = (idx / numberOfHooks) * 0.25 + 0.7;
				compilation.hooks[name].intercept({
					name: "ProgressPlugin",
					call() {
						handler(percentage, title);
					},
					done() {
						handler(percentage, title);
					},
					result() {
						handler(percentage, title);
					},
					error() {
						handler(percentage, title);
					},
					tap(tap) {
						// p is percentage from 0 to 1
						// args is any number of messages in a hierarchical matter
						progressReporters.set(compilation.compiler, (p, ...args) => {
							handler(percentage, title, tap.name, ...args);
						});
						handler(percentage, title, tap.name);
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
				handler(0.7, "building");
			}
		});
		const interceptHook = (hook, progress, name) => {
			hook.intercept({
				name: "ProgressPlugin",
				call() {
					handler(progress, name);
				},
				done() {
					handler(progress, name);
				},
				result() {
					handler(progress, name);
				},
				error() {
					handler(progress, name);
				},
				tap(tap) {
					progressReporters.set(compiler, (p, ...args) => {
						handler(progress, name, tap.name, ...args);
					});
					handler(progress, name, tap.name);
				}
			});
		};
		interceptHook(compiler.hooks.initialize, 0.0, "initialize");
		interceptHook(compiler.hooks.beforeRun, 0.01, "before run");
		interceptHook(compiler.hooks.run, 0.02, "run");
		interceptHook(compiler.hooks.watchRun, 0.02, "watch run");
		interceptHook(
			compiler.hooks.normalModuleFactory,
			0.03,
			"normal module factory"
		);
		interceptHook(
			compiler.hooks.contextModuleFactory,
			0.03,
			"context module factory"
		);
		interceptHook(compiler.hooks.beforeCompile, 0.035, "before compile");
		interceptHook(compiler.hooks.compile, 0.04, "compile");
		interceptHook(compiler.hooks.thisCompilation, 0.05, "setup compilation");
		interceptHook(compiler.hooks.compilation, 0.06, "setup compilation");
		interceptHook(compiler.hooks.emit, 0.95, "emitting");
		interceptHook(compiler.hooks.afterEmit, 0.98, "after emitting");
		interceptHook(compiler.hooks.done, 0.99, "done");
		interceptHook(compiler.hooks.watchClose, 0.99, "closing watch compilation");
		compiler.hooks.done.intercept({
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
