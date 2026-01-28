/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Compiler = require("./Compiler");
const MultiCompiler = require("./MultiCompiler");
const NormalModule = require("./NormalModule");
const createSchemaValidation = require("./util/create-schema-validation");
const { contextify } = require("./util/identifier");

/** @typedef {import("tapable").Tap} Tap */
/**
 * @template T, R, AdditionalOptions
 * @typedef {import("tapable").Hook<T, R, AdditionalOptions>} Hook
 */
/** @typedef {import("../declarations/plugins/ProgressPlugin").ProgressPluginArgument} ProgressPluginArgument */
/** @typedef {import("./Compilation").FactorizeModuleOptions} FactorizeModuleOptions */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Entrypoint").EntryOptions} EntryOptions */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleFactory").ModuleFactoryResult} ModuleFactoryResult */
/** @typedef {import("./logging/Logger").Logger} Logger */

/**
 * @template T, K, R
 * @typedef {import("./util/AsyncQueue")<T, K, R>} AsyncQueue
 */

/**
 * @typedef {object} CountsData
 * @property {number} modulesCount modules count
 * @property {number} dependenciesCount dependencies count
 */

const validate = createSchemaValidation(
	require("../schemas/plugins/ProgressPlugin.check"),
	() => require("../schemas/plugins/ProgressPlugin.json"),
	{
		name: "Progress Plugin",
		baseDataPath: "options"
	}
);

/**
 * @param {number} a a
 * @param {number} b b
 * @param {number} c c
 * @returns {number} median
 */
const median3 = (a, b, c) => a + b + c - Math.max(a, b, c) - Math.min(a, b, c);

/** @typedef {(percentage: number, msg: string, ...args: string[]) => void} HandlerFn */

/**
 * @param {number} ms milliseconds
 * @returns {string} formatted time string
 */
const formatTime = (ms) => {
	if (ms < 1000) return `${Math.round(ms)}ms`;
	const seconds = Math.floor(ms / 1000);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return `${hours}h ${remainingMinutes}m`;
};

/**
 * @param {number} percentage progress percentage (0-1)
 * @param {number} width bar width in characters
 * @returns {string} progress bar string
 */
const createProgressBar = (percentage, width = 40) => {
	const filled = Math.round(percentage * width);
	const empty = width - filled;
	const bar = "█".repeat(filled) + "░".repeat(empty);
	return `[${bar}]`;
};

/**
 * @param {boolean | null | undefined} profile need profile
 * @param {Logger} logger logger
 * @param {{ progressBar?: boolean, estimatedTime?: boolean, phaseTimings?: boolean, progressBarWidth?: number }} options enhanced options
 * @returns {HandlerFn} default handler
 */
const createDefaultHandler = (profile, logger, options = {}) => {
	const {
		progressBar = false,
		estimatedTime = false,
		phaseTimings = false,
		progressBarWidth = 40
	} = options;
	/** @type {{ value: string | undefined, time: number }[]} */
	const lastStateInfo = [];
	/** @type {number} */
	let buildStartTime = 0;
	/** @type {Map<string, { start: number, duration: number }>} */
	const phaseTimingData = new Map();
	/** @type {string | undefined} */
	let currentPhase;

	/** @type {HandlerFn} */
	const defaultHandler = (percentage, msg, ...args) => {
		const now = Date.now();

		// Track build start time
		if (percentage === 0) {
			buildStartTime = now;
			phaseTimingData.clear();
			currentPhase = undefined;
		}

		// Track phase timings
		if (phaseTimings && msg) {
			const phase = msg;
			if (currentPhase !== phase) {
				// End previous phase
				if (currentPhase) {
					const phaseData = phaseTimingData.get(currentPhase);
					if (phaseData) {
						phaseData.duration = now - phaseData.start;
					}
				}
				// Start new phase
				currentPhase = phase;
				if (!phaseTimingData.has(phase)) {
					phaseTimingData.set(phase, { start: now, duration: 0 });
				}
			}
		}

		if (profile) {
			if (percentage === 0) {
				lastStateInfo.length = 0;
			}
			const fullState = [msg, ...args];
			const state = fullState.map((s) => s.replace(/\d+\/\d+ /g, ""));
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
								reportState = `${lastStateInfo[i - 1].value} > ${reportState}`;
							}
							const stateMsg = `${" | ".repeat(i)}${diff} ms ${reportState}`;
							const d = diff;
							// This depends on timing so we ignore it for coverage
							/* eslint-disable no-lone-blocks */
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
							/* eslint-enable no-lone-blocks */
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
		// Build the status message with optional enhancements
		/** @type {string[]} */
		const statusParts = [];

		// Add progress bar if enabled
		if (progressBar) {
			statusParts.push(createProgressBar(percentage, progressBarWidth));
		}

		// Add percentage
		statusParts.push(`${Math.floor(percentage * 100)}%`);

		// Add estimated time remaining if enabled and we have enough progress
		if (estimatedTime && percentage > 0.05 && percentage < 1) {
			const elapsed = now - buildStartTime;
			const estimatedTotal = elapsed / percentage;
			const remaining = estimatedTotal - elapsed;
			if (remaining > 0) {
				statusParts.push(`ETA: ${formatTime(remaining)}`);
			}
		}

		// Add phase timing info if enabled
		if (phaseTimings && currentPhase) {
			const phaseData = phaseTimingData.get(currentPhase);
			if (phaseData) {
				const phaseDuration = now - phaseData.start;
				statusParts.push(`[${currentPhase}: ${formatTime(phaseDuration)}]`);
			}
		}

		logger.status(...statusParts, msg, ...args);

		// Log phase timing summary at the end
		if (percentage === 1 || (!msg && args.length === 0)) {
			if (phaseTimings && phaseTimingData.size > 0) {
				// End the last phase
				if (currentPhase) {
					const phaseData = phaseTimingData.get(currentPhase);
					if (phaseData) {
						phaseData.duration = now - phaseData.start;
					}
				}
				const totalTime = now - buildStartTime;
				logger.info(`Build completed in ${formatTime(totalTime)}`);
				logger.info("Phase breakdown:");
				for (const [phase, data] of phaseTimingData) {
					if (data.duration > 0) {
						const percent = Math.round((data.duration / totalTime) * 100);
						logger.info(
							`  ${phase}: ${formatTime(data.duration)} (${percent}%)`
						);
					}
				}
			}
			logger.status();
		}
	};

	return defaultHandler;
};

const SKIPPED_QUEUE_CONTEXTS = ["import-module", "load-module"];

/**
 * @callback ReportProgress
 * @param {number} p percentage
 * @param {...string} args additional arguments
 * @returns {void}
 */

/** @type {WeakMap<Compiler, ReportProgress | undefined>} */
const progressReporters = new WeakMap();

const PLUGIN_NAME = "ProgressPlugin";

class ProgressPlugin {
	/**
	 * @param {Compiler} compiler the current compiler
	 * @returns {ReportProgress | undefined} a progress reporter, if any
	 */
	static getReporter(compiler) {
		return progressReporters.get(compiler);
	}

	/**
	 * @param {ProgressPluginArgument} options options
	 */
	constructor(options = {}) {
		if (typeof options === "function") {
			options = {
				handler: options
			};
		}

		validate(options);
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
		this.progressBar = options.progressBar;
		this.estimatedTime = options.estimatedTime;
		this.phaseTimings = options.phaseTimings;
		this.progressBarWidth = options.progressBarWidth;
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
				compiler.getInfrastructureLogger("webpack.Progress"),
				{
					progressBar: this.progressBar,
					estimatedTime: this.estimatedTime,
					phaseTimings: this.phaseTimings,
					progressBarWidth: this.progressBarWidth
				}
			);
		if (compiler instanceof MultiCompiler) {
			this._applyOnMultiCompiler(compiler, handler);
		} else if (compiler instanceof Compiler) {
			this._applyOnCompiler(compiler, handler);
		}
	}

	/**
	 * @param {MultiCompiler} compiler webpack multi-compiler
	 * @param {HandlerFn} handler function that executes for every progress step
	 * @returns {void}
	 */
	_applyOnMultiCompiler(compiler, handler) {
		const states = compiler.compilers.map(
			() => /** @type {[number, ...string[]]} */ ([0])
		);
		for (const [idx, item] of compiler.compilers.entries()) {
			new ProgressPlugin((p, msg, ...args) => {
				states[idx] = [p, msg, ...args];
				let sum = 0;
				for (const [p] of states) sum += p;
				handler(sum / states.length, `[${idx}] ${msg}`, ...args);
			}).apply(item);
		}
	}

	/**
	 * @param {Compiler} compiler webpack compiler
	 * @param {HandlerFn} handler function that executes for every progress step
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
		let skippedModulesCount = 0;
		let dependenciesCount = 0;
		let skippedDependenciesCount = 0;
		let entriesCount = 1;
		let doneModules = 0;
		let doneDependencies = 0;
		let doneEntries = 0;
		/** @type {Set<string>} */
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
				Math.max(lastModulesCount || this.modulesCount || 1, modulesCount);
			const percentByEntries =
				doneEntries /
				Math.max(lastEntriesCount || this.dependenciesCount || 1, entriesCount);
			const percentByDependencies =
				doneDependencies /
				Math.max(lastDependenciesCount || 1, dependenciesCount);
			/** @type {number} */
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
				/** @type {string[]} */
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

		/**
		 * @template T
		 * @param {AsyncQueue<FactorizeModuleOptions, string, Module | ModuleFactoryResult>} factorizeQueue async queue
		 * @param {T} _item item
		 */
		const factorizeAdd = (factorizeQueue, _item) => {
			if (SKIPPED_QUEUE_CONTEXTS.includes(factorizeQueue.getContext())) {
				skippedDependenciesCount++;
			}
			dependenciesCount++;
			if (dependenciesCount < 50 || dependenciesCount % 100 === 0) {
				updateThrottled();
			}
		};

		const factorizeDone = () => {
			doneDependencies++;
			if (doneDependencies < 50 || doneDependencies % 100 === 0) {
				updateThrottled();
			}
		};

		/**
		 * @template T
		 * @param {AsyncQueue<Module, string, Module>} addModuleQueue async queue
		 * @param {T} _item item
		 */
		const moduleAdd = (addModuleQueue, _item) => {
			if (SKIPPED_QUEUE_CONTEXTS.includes(addModuleQueue.getContext())) {
				skippedModulesCount++;
			}
			modulesCount++;
			if (modulesCount < 50 || modulesCount % 100 === 0) updateThrottled();
		};

		// only used when showActiveModules is set
		/**
		 * @param {Module} module the module
		 */
		const moduleBuild = (module) => {
			const ident = module.identifier();
			if (ident) {
				activeModules.add(ident);
				lastActiveModule = ident;
				update();
			}
		};

		/**
		 * @param {Dependency} entry entry dependency
		 * @param {EntryOptions} options options object
		 */
		const entryAdd = (entry, options) => {
			entriesCount++;
			if (entriesCount < 5 || entriesCount % 10 === 0) updateThrottled();
		};

		/**
		 * @param {Module} module the module
		 */
		const moduleDone = (module) => {
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
			if (doneModules < 50 || doneModules % 100 === 0) updateThrottled();
		};

		/**
		 * @param {Dependency} entry entry dependency
		 * @param {EntryOptions} options options object
		 */
		const entryDone = (entry, options) => {
			doneEntries++;
			update();
		};

		const cache = compiler.getCache(PLUGIN_NAME).getItemCache("counts", null);

		/** @type {Promise<CountsData> | undefined} */
		let cacheGetPromise;

		compiler.hooks.beforeCompile.tap(PLUGIN_NAME, () => {
			if (!cacheGetPromise) {
				cacheGetPromise = cache.getPromise().then(
					(data) => {
						if (data) {
							lastModulesCount = lastModulesCount || data.modulesCount;
							lastDependenciesCount =
								lastDependenciesCount || data.dependenciesCount;
						}
						return data;
					},
					(_err) => {
						// Ignore error
					}
				);
			}
		});

		compiler.hooks.afterCompile.tapPromise(PLUGIN_NAME, (compilation) => {
			if (compilation.compiler.isChild()) return Promise.resolve();
			return /** @type {Promise<CountsData>} */ (cacheGetPromise).then(
				async (oldData) => {
					const realModulesCount = modulesCount - skippedModulesCount;
					const realDependenciesCount =
						dependenciesCount - skippedDependenciesCount;

					if (
						!oldData ||
						oldData.modulesCount !== realModulesCount ||
						oldData.dependenciesCount !== realDependenciesCount
					) {
						await cache.storePromise({
							modulesCount: realModulesCount,
							dependenciesCount: realDependenciesCount
						});
					}
				}
			);
		});

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			if (compilation.compiler.isChild()) return;
			lastModulesCount = modulesCount;
			lastEntriesCount = entriesCount;
			lastDependenciesCount = dependenciesCount;
			modulesCount =
				skippedModulesCount =
				dependenciesCount =
				skippedDependenciesCount =
				entriesCount =
					0;
			doneModules = doneDependencies = doneEntries = 0;

			compilation.factorizeQueue.hooks.added.tap(PLUGIN_NAME, (item) =>
				factorizeAdd(compilation.factorizeQueue, item)
			);
			compilation.factorizeQueue.hooks.result.tap(PLUGIN_NAME, factorizeDone);

			compilation.addModuleQueue.hooks.added.tap(PLUGIN_NAME, (item) =>
				moduleAdd(compilation.addModuleQueue, item)
			);
			compilation.processDependenciesQueue.hooks.result.tap(
				PLUGIN_NAME,
				moduleDone
			);

			if (showActiveModules) {
				compilation.hooks.buildModule.tap(PLUGIN_NAME, moduleBuild);
			}

			compilation.hooks.addEntry.tap(PLUGIN_NAME, entryAdd);
			compilation.hooks.failedEntry.tap(PLUGIN_NAME, entryDone);
			compilation.hooks.succeedEntry.tap(PLUGIN_NAME, entryDone);

			// @ts-expect-error avoid dynamic require if bundled with webpack
			if (typeof __webpack_require__ !== "function") {
				/** @type {Set<string>} */
				const requiredLoaders = new Set();
				NormalModule.getCompilationHooks(compilation).beforeLoaders.tap(
					PLUGIN_NAME,
					(loaders) => {
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
			for (const [idx, name] of Object.keys(hooks).entries()) {
				const title = hooks[/** @type {keyof typeof hooks} */ (name)];
				const percentage = (idx / numberOfHooks) * 0.25 + 0.7;
				compilation.hooks[/** @type {keyof typeof hooks} */ (name)].intercept({
					name: PLUGIN_NAME,
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
			}
		});
		compiler.hooks.make.intercept({
			name: PLUGIN_NAME,
			call() {
				handler(0.1, "building");
			},
			done() {
				handler(0.65, "building");
			}
		});
		/**
		 * @template {Hook<EXPECTED_ANY, EXPECTED_ANY, EXPECTED_ANY>} T
		 * @param {T} hook hook
		 * @param {number} progress progress from 0 to 1
		 * @param {string} category category
		 * @param {string} name name
		 */
		const interceptHook = (hook, progress, category, name) => {
			hook.intercept({
				name: PLUGIN_NAME,
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
				/**
				 * @param {Tap} tap tap
				 */
				tap(tap) {
					progressReporters.set(compiler, (p, ...args) => {
						handler(progress, category, name, tap.name, ...args);
					});
					handler(progress, category, name, tap.name);
				}
			});
		};
		compiler.cache.hooks.endIdle.intercept({
			name: PLUGIN_NAME,
			call() {
				handler(0, "");
			}
		});
		interceptHook(compiler.cache.hooks.endIdle, 0.01, "cache", "end idle");
		compiler.hooks.beforeRun.intercept({
			name: PLUGIN_NAME,
			call() {
				handler(0, "");
			}
		});
		interceptHook(compiler.hooks.beforeRun, 0.01, "setup", "before run");
		interceptHook(compiler.hooks.run, 0.02, "setup", "run");
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
			name: PLUGIN_NAME,
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
			name: PLUGIN_NAME,
			done() {
				handler(1, "");
			}
		});
		compiler.cache.hooks.shutdown.intercept({
			name: PLUGIN_NAME,
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
	entries: true,
	progressBar: false,
	estimatedTime: false,
	phaseTimings: false,
	progressBarWidth: 40
};

ProgressPlugin.createDefaultHandler = createDefaultHandler;

module.exports = ProgressPlugin;
