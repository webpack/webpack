/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Compiler = require("./Compiler");
const MultiCompiler = require("./MultiCompiler");
const NormalModule = require("./NormalModule");
const { contextify } = require("./util/identifier");
const memoize = require("./util/memoize");

const getColors = memoize(() => {
	const cli = require("./cli");

	return cli.createColors({ useColor: cli.isColorSupported() });
});

const BAR_LENGTH = 25;
const BLOCK_CHAR = "━";
const BULLET_ICON = "●";

/** @typedef {import("tapable").Tap} Tap */
/**
 * Defines the hook type used by this module.
 * @template T, R, AdditionalOptions
 * @typedef {import("tapable").Hook<T, R, AdditionalOptions>} Hook
 */
/** @typedef {import("../declarations/plugins/ProgressPlugin").ProgressPluginArgument} ProgressPluginArgument */
/** @typedef {import("../declarations/plugins/ProgressPlugin").ProgressPluginOptions} ProgressPluginOptions */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Entrypoint").EntryOptions} EntryOptions */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./logging/Logger").Logger} Logger */
/** @typedef {import("./cli").Colors} Colors */

/**
 * Returns median.
 * @param {number} a a
 * @param {number} b b
 * @param {number} c c
 * @returns {number} median
 */
const median3 = (a, b, c) => a + b + c - Math.max(a, b, c) - Math.min(a, b, c);

/** @typedef {(percentage: number, msg: string, ...args: string[]) => void} HandlerFn */

/**
 * @param {Logger} logger logger
 * @param {{ value: string | undefined, time: number }[]} lastStateInfo mutable state
 * @param {number} percentage percentage
 * @param {string} msg msg
 * @param {string[]} args args
 */
const reportProfile = (logger, lastStateInfo, percentage, msg, args) => {
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
};

/**
 * @param {number} ms milliseconds
 * @returns {string} human readable duration
 */
const formatTime = (ms) => {
	if (ms < 1000) return `${Math.round(ms)}ms`;
	const seconds = Math.floor(ms / 1000);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
	const hours = Math.floor(minutes / 60);
	return `${hours}h ${minutes % 60}m`;
};

/**
 * @param {string} name progress bar name
 * @param {string} color progress bar color
 * @param {number} width progress bar width in characters
 * @returns {(percentage: number) => string} bar renderer
 */
const createReportBar = (name, color, width) => {
	const c = getColors();
	const colorFn = color in c ? c[/** @type {keyof Colors} */ (color)] : c.green;
	// The bar only changes when the filled width does, so cache it between steps.
	let lastFilled = -1;
	let lastBar = "";

	return (percentage) => {
		const filled = Math.round(percentage * width);
		if (filled === lastFilled) return lastBar;
		lastFilled = filled;
		const filledStr = BLOCK_CHAR.repeat(filled);
		const emptyStr = BLOCK_CHAR.repeat(width - filled);
		lastBar = `${[BULLET_ICON, name, filledStr].map(colorFn).join(" ")}${c.white(
			emptyStr
		)}`;
		return lastBar;
	};
};

/** @typedef {Required<Exclude<NonNullable<ProgressPluginOptions["progressBar"]>, boolean | "auto">>} ProgressBarOptions */

/** @type {ProgressBarOptions} */
const DEFAULT_PROGRESS_BAR = {
	name: "Build",
	color: "green",
	width: BAR_LENGTH
};

/** @typedef {{ progressBar?: ProgressBarOptions | false, estimatedTime?: boolean, phaseTimings?: boolean }} DefaultHandlerOptions */

/**
 * Creates a default handler.
 * @param {boolean | null | undefined} profile need profile
 * @param {Logger} logger logger
 * @param {DefaultHandlerOptions=} options display options
 * @returns {HandlerFn} default handler
 */
const createDefaultHandler = (profile, logger, options = {}) => {
	const {
		progressBar = false,
		estimatedTime = false,
		phaseTimings = false
	} = options;
	const trackTime = estimatedTime || phaseTimings;

	/** @type {{ value: string | undefined, time: number }[]} */
	const lastStateInfo = [];
	let buildStart = 0;
	// Exponential moving average of the estimated total build time (0 = unset).
	let smoothedTotal = 0;
	/** @type {Map<string, number>} accumulated ms per phase (msg) */
	const phaseTimes = new Map();
	/** @type {string | undefined} */
	let currentPhase;
	let currentPhaseStart = 0;
	let summaryReported = false;
	/** @type {((percentage: number) => string) | undefined} */
	let reportBar;

	/**
	 * @param {number} now current timestamp
	 * @returns {void}
	 */
	const reportPhaseSummary = (now) => {
		if (!phaseTimings || summaryReported || phaseTimes.size === 0) return;
		summaryReported = true;
		// Flush the phase still running at completion.
		if (currentPhase !== undefined) {
			phaseTimes.set(
				currentPhase,
				(phaseTimes.get(currentPhase) || 0) + (now - currentPhaseStart)
			);
		}
		const total = now - buildStart;
		logger.info(`Build completed in ${formatTime(total)}`);
		logger.info("Phase breakdown:");
		for (const [phase, duration] of phaseTimes) {
			if (duration > 0) {
				const percent = total > 0 ? Math.round((duration / total) * 100) : 0;
				logger.info(`  ${phase}: ${formatTime(duration)} (${percent}%)`);
			}
		}
	};

	/** @type {HandlerFn} */
	const defaultHandler = (percentage, msg, ...args) => {
		if (profile) {
			reportProfile(logger, lastStateInfo, percentage, msg, args);
		}

		const now = trackTime ? Date.now() : 0;

		if (trackTime && percentage === 0) {
			buildStart = now;
			smoothedTotal = 0;
			summaryReported = false;
			phaseTimes.clear();
			currentPhase = undefined;
			currentPhaseStart = now;
		}

		// Accumulate time under the previous phase whenever the top-level message changes.
		if (phaseTimings && msg && msg !== currentPhase) {
			if (currentPhase !== undefined) {
				phaseTimes.set(
					currentPhase,
					(phaseTimes.get(currentPhase) || 0) + (now - currentPhaseStart)
				);
			}
			currentPhase = msg;
			currentPhaseStart = now;
		}

		/** @type {string | undefined} */
		let eta;
		if (estimatedTime && percentage > 0.05 && percentage < 1) {
			const elapsed = now - buildStart;
			const rawTotal = elapsed / percentage;
			smoothedTotal =
				smoothedTotal > 0 ? smoothedTotal * 0.7 + rawTotal * 0.3 : rawTotal;
			const remaining = smoothedTotal - elapsed;
			if (remaining > 0) eta = `ETA: ${formatTime(remaining)}`;
		}

		if (progressBar) {
			// Build the bar renderer once, then reuse it across every step.
			if (reportBar === undefined) {
				reportBar = createReportBar(
					progressBar.name,
					progressBar.color,
					progressBar.width
				);
			}
			const c = getColors();
			/** @type {string} */
			const currentBar = reportBar(percentage);
			const suffix = eta ? ` ${eta}` : "";

			if (percentage === 1) {
				logger.status();
				reportPhaseSummary(now);
			} else if (msg) {
				logger.status(
					`${currentBar} (${Math.floor(percentage * 100)}%)${suffix}`,
					`\n${[msg, ...args].map(c.gray).join(" ")}`
				);
			} else {
				logger.status(
					`${currentBar} (${Math.floor(percentage * 100)}%)${suffix}`
				);
			}
			return;
		}

		if (eta) {
			logger.status(`${Math.floor(percentage * 100)}%`, msg, ...args, eta);
		} else {
			logger.status(`${Math.floor(percentage * 100)}%`, msg, ...args);
		}
		if (percentage === 1 || (!msg && args.length === 0)) {
			if (percentage === 1) reportPhaseSummary(now);
			logger.status();
		}
	};

	return defaultHandler;
};

/**
 * Defines the report progress callback.
 * @callback ReportProgress
 * @param {number} p percentage
 * @param {...string} args additional arguments
 * @returns {void}
 */

/** @type {WeakMap<Compiler, ReportProgress | undefined>} */
const progressReporters = new WeakMap();

const PLUGIN_NAME = "ProgressPlugin";

/** @type {Required<Omit<ProgressPluginOptions, "handler">>} */
const DEFAULT_OPTIONS = {
	profile: false,
	modulesCount: 5000,
	dependenciesCount: 10000,
	modules: true,
	dependencies: true,
	activeModules: false,
	entries: true,
	percentBy: null,
	progressBar: false,
	estimatedTime: false,
	phaseTimings: false
};

/**
 * Whether progress can be rendered in place (interactive TTY). The bar is only
 * useful here; in append-only output every update becomes a new line.
 * @param {Compiler | MultiCompiler} compiler compiler
 * @returns {boolean} true when output is an interactive terminal
 */
const isInteractive = (compiler) => {
	const c =
		compiler instanceof MultiCompiler ? compiler.compilers[0] : compiler;
	const infrastructureLogging =
		c && c.options && c.options.infrastructureLogging;
	if (
		infrastructureLogging &&
		typeof infrastructureLogging.appendOnly === "boolean"
	) {
		return !infrastructureLogging.appendOnly;
	}
	const stream =
		(infrastructureLogging && infrastructureLogging.stream) || process.stderr;
	return (
		Boolean(/** @type {NodeJS.WriteStream} */ (stream).isTTY) &&
		process.env.TERM !== "dumb"
	);
};

class ProgressPlugin {
	/**
	 * Returns a progress reporter, if any.
	 * @param {Compiler} compiler the current compiler
	 * @returns {ReportProgress | undefined} a progress reporter, if any
	 */
	static getReporter(compiler) {
		return progressReporters.get(compiler);
	}

	/**
	 * Creates an instance of ProgressPlugin.
	 * @param {ProgressPluginArgument} options options
	 */
	constructor(options = {}) {
		if (typeof options === "function") {
			options = {
				handler: options
			};
		}

		/** @type {ProgressPluginOptions} */
		this.options = options;

		const merged = { ...DEFAULT_OPTIONS, ...options };
		/** @type {boolean | null} */
		this.profile = merged.profile;
		/** @type {HandlerFn | undefined} */
		this.handler = merged.handler;
		/** @type {number} */
		this.modulesCount = merged.modulesCount;
		/** @type {number} */
		this.dependenciesCount = merged.dependenciesCount;
		/** @type {boolean} */
		this.showEntries = merged.entries;
		/** @type {boolean} */
		this.showModules = merged.modules;
		/** @type {boolean} */
		this.showDependencies = merged.dependencies;
		/** @type {boolean} */
		this.showActiveModules = merged.activeModules;
		this.percentBy = merged.percentBy;

		const progressBar = merged.progressBar;
		/** @type {ProgressBarOptions | false | "auto"} */
		this.progressBar =
			progressBar === "auto"
				? "auto"
				: progressBar
					? {
							...DEFAULT_PROGRESS_BAR,
							...(progressBar === true ? {} : progressBar)
						}
					: false;
		/** @type {boolean} */
		this.estimatedTime = merged.estimatedTime;
		/** @type {boolean} */
		this.phaseTimings = merged.phaseTimings;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler | MultiCompiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		let progressBar = this.progressBar;
		// webpack@6 (opt-in today via `experiments.futureDefaults`) turns an unset
		// progressBar into the auto bar; an explicit `false` is still respected.
		if (progressBar === false && this.options.progressBar === undefined) {
			const c =
				compiler instanceof MultiCompiler ? compiler.compilers[0] : compiler;
			if (c && c.options && c.options.experiments.futureDefaults) {
				progressBar = "auto";
			}
		}
		if (progressBar === "auto") {
			progressBar = isInteractive(compiler)
				? { ...DEFAULT_PROGRESS_BAR }
				: false;
		}
		const handler =
			this.handler ||
			createDefaultHandler(
				this.profile,
				compiler.getInfrastructureLogger("webpack.Progress"),
				{
					progressBar,
					estimatedTime: this.estimatedTime,
					phaseTimings: this.phaseTimings
				}
			);
		if (compiler instanceof MultiCompiler) {
			this._applyOnMultiCompiler(compiler, handler);
		} else if (compiler instanceof Compiler) {
			this._applyOnCompiler(compiler, handler);
		}
	}

	/**
	 * Apply on multi compiler.
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
	 * Processes the provided compiler.
	 * @param {Compiler} compiler webpack compiler
	 * @param {HandlerFn} handler function that executes for every progress step
	 * @returns {void}
	 */
	_applyOnCompiler(compiler, handler) {
		compiler.hooks.validate.tap(PLUGIN_NAME, () => {
			compiler.validate(
				() => require("../schemas/plugins/ProgressPlugin.json"),
				this.options,
				{
					name: "Progress Plugin",
					baseDataPath: "options"
				},
				(options) => require("../schemas/plugins/ProgressPlugin.check")(options)
			);
		});

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

		const factorizeAdd = () => {
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

		const moduleAdd = () => {
			modulesCount++;
			if (modulesCount < 50 || modulesCount % 100 === 0) updateThrottled();
		};

		// only used when showActiveModules is set
		/**
		 * Processes the provided module.
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
		 * Processes the provided entry.
		 * @param {Dependency} entry entry dependency
		 * @param {EntryOptions} options options object
		 */
		const entryAdd = (entry, options) => {
			entriesCount++;
			if (entriesCount < 5 || entriesCount % 10 === 0) updateThrottled();
		};

		/**
		 * Processes the provided module.
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
		 * Processes the provided entry.
		 * @param {Dependency} entry entry dependency
		 * @param {EntryOptions} options options object
		 */
		const entryDone = (entry, options) => {
			doneEntries++;
			update();
		};

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			if (compilation.compiler.isChild()) return;
			// Carry the previous compilation's counts into the next as an estimate
			// (helps watch rebuilds); not persisted, to avoid cache invalidation.
			lastModulesCount = modulesCount;
			lastEntriesCount = entriesCount;
			lastDependenciesCount = dependenciesCount;
			modulesCount = dependenciesCount = entriesCount = 0;
			doneModules = doneDependencies = doneEntries = 0;

			compilation.factorizeQueue.hooks.added.tap(PLUGIN_NAME, factorizeAdd);
			compilation.factorizeQueue.hooks.result.tap(PLUGIN_NAME, factorizeDone);

			compilation.addModuleQueue.hooks.added.tap(PLUGIN_NAME, moduleAdd);
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
		 * Processes the provided hook.
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
				 * Processes the provided tap.
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

ProgressPlugin.defaultOptions = DEFAULT_OPTIONS;

ProgressPlugin.createDefaultHandler = createDefaultHandler;

module.exports = ProgressPlugin;
