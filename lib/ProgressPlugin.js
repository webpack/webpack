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

const createDefaultHandler = profile => {
	let lineCaretPosition = 0;
	let lastMessage = "";
	let lastState;
	let lastStateTime;

	const defaultHandler = (percentage, msg, ...args) => {
		let state = msg;
		const details = args.filter(v => v.length);
		const maxLineLength = process.stderr.columns || Infinity;
		if (percentage < 1) {
			percentage = Math.floor(percentage * 100);
			msg = `${percentage}% ${msg}`;
			if (percentage < 100) {
				msg = ` ${msg}`;
			}
			if (percentage < 10) {
				msg = ` ${msg}`;
			}

			if (details.length) {
				const maxTotalDetailsLength = maxLineLength - msg.length;
				const totalDetailsLength = details.reduce(
					(a, b) => a + b.length,
					details.length // account for added space before each detail text
				);
				const maxDetailLength =
					totalDetailsLength < maxTotalDetailsLength
						? Infinity
						: Math.floor(maxTotalDetailsLength / details.length);

				for (let detail of details) {
					if (!detail) continue;
					if (detail.length + 1 > maxDetailLength) {
						const truncatePrefix = "...";
						detail = `${truncatePrefix}${detail.substr(
							-(maxDetailLength - truncatePrefix.length - 1)
						)}`;
					}
					msg += ` ${detail}`;
				}
			}
		}
		if (profile) {
			state = state.replace(/^\d+\/\d+\s+/, "");
			if (percentage === 0) {
				lastState = null;
				lastStateTime = Date.now();
			} else if (state !== lastState || percentage === 1) {
				const now = Date.now();
				if (lastState) {
					const stateMsg = `${now - lastStateTime}ms ${lastState}`;
					goToLineStart(stateMsg);
					process.stderr.write(stateMsg + "\n");
					lineCaretPosition = 0;
				}
				lastState = state;
				lastStateTime = now;
			}
		}
		if (lastMessage !== msg) {
			goToLineStart(msg);
			msg = msg.substring(0, maxLineLength);
			process.stderr.write(msg);
			lastMessage = msg;
		}
	};

	const goToLineStart = nextMessage => {
		let str = "";
		for (; lineCaretPosition > nextMessage.length; lineCaretPosition--) {
			str += "\b \b";
		}
		for (var i = 0; i < lineCaretPosition; i++) {
			str += "\b";
		}
		lineCaretPosition = nextMessage.length;
		if (str) process.stderr.write(str);
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
		validateOptions(schema, options, "Progress Plugin");
		options = { ...ProgressPlugin.defaultOptions, ...options };

		this.profile = options.profile;
		this.handler = options.handler;
		this.modulesCount = options.modulesCount;
		this.showEntries = options.entries;
		this.showModules = options.modules;
		this.showActiveModules = options.activeModules;
	}

	/**
	 * @param {Compiler | MultiCompiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const handler = this.handler || createDefaultHandler(this.profile);
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
		const states = compiler.compilers.map(() => null);
		compiler.compilers.forEach((compiler, idx) => {
			new ProgressPlugin((p, msg, ...args) => {
				states[idx] = [p, msg, ...args];
				handler(
					states
						.map(state => (state && state[0]) || 0)
						.reduce((a, b) => a + b) / states.length,
					`[${idx}] ${msg}`,
					...args
				);
			}).apply(compiler);
		});
	}

	/**
	 * @param {Compiler} compiler webpack compiler
	 * @param {HandlerFunction} handler function that executes for every progress step
	 * @returns {void}
	 */
	_applyOnCompiler(compiler, handler) {
		const { modulesCount } = this;
		const showEntries = this.showEntries;
		const showModules = this.showModules;
		const showActiveModules = this.showActiveModules;
		let lastActiveModule = "";
		let lastModulesCount = 0;
		let lastEntriesCount = 0;
		let moduleCount = modulesCount;
		let entriesCount = 1;
		let doneModules = 0;
		let doneEntries = 0;
		const activeModules = new Set();

		const update = () => {
			/** @type {string[]} */
			const items = [];
			const percentByModules =
				doneModules / Math.max(lastModulesCount, moduleCount);
			const percentByEntries =
				doneEntries / Math.max(lastEntriesCount, entriesCount);
			const percentage =
				0.1 + Math.max(percentByModules, percentByEntries) * 0.6;
			if (showEntries) {
				items.push(`${doneEntries}/${entriesCount} entries`);
			}
			if (showModules) {
				items.push(`${doneModules}/${moduleCount} modules`);
			}
			if (showActiveModules) {
				items.push(`${activeModules.size} active`);
				items.push(lastActiveModule);
			}
			handler(percentage, "building", ...items);
		};

		const moduleAdd = module => {
			moduleCount++;
			if (moduleCount % 100 === 0) update();
		};

		const moduleBuild = module => {
			if (showActiveModules) {
				const ident = module.identifier();
				if (ident) {
					activeModules.add(ident);
					lastActiveModule = ident;
				}
			}
			update();
		};

		const entryAdd = (entry, name) => {
			entriesCount++;
			if (entriesCount % 10 === 0) update();
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
						if (doneModules % 100 !== 0) update();
					}
				}
			}
			if (doneModules % 100 === 0) update();
		};

		const entryDone = (entry, name) => {
			doneEntries++;
			update();
		};

		compiler.hooks.compilation.tap("ProgressPlugin", compilation => {
			if (compilation.compiler.isChild()) return;
			lastModulesCount = moduleCount;
			lastEntriesCount = entriesCount;
			moduleCount = entriesCount = 0;
			doneModules = doneEntries = 0;
			handler(0, "compiling");

			compilation.addModuleQueue.hooks.added.tap("ProgressPlugin", moduleAdd);
			compilation.hooks.buildModule.tap("ProgressPlugin", moduleBuild);
			compilation.hooks.failedModule.tap("ProgressPlugin", moduleDone);
			compilation.hooks.succeedModule.tap("ProgressPlugin", moduleDone);
			compilation.hooks.stillValidModule.tap("ProgressPlugin", moduleDone);

			compilation.hooks.addEntry.tap("ProgressPlugin", entryAdd);
			compilation.hooks.failedEntry.tap("ProgressPlugin", entryDone);
			compilation.hooks.succeedEntry.tap("ProgressPlugin", entryDone);

			const hooks = {
				finishModules: "finish module graph",
				seal: "sealing",
				beforeChunks: "chunk graph",
				afterChunks: "after chunk graph",
				optimizeDependencies: "dependencies optimization",
				afterOptimizeDependencies: "after dependencies optimization",
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
		compiler.hooks.emit.intercept({
			name: "ProgressPlugin",
			call() {
				handler(0.95, "emitting");
			},
			tap(tap) {
				progressReporters.set(compiler, (p, ...args) => {
					handler(0.95, "emitting", tap.name, ...args);
				});
				handler(0.95, "emitting", tap.name);
			}
		});
		compiler.hooks.afterEmit.intercept({
			name: "ProgressPlugin",
			call() {
				handler(0.98, "after emitting");
			},
			tap(tap) {
				progressReporters.set(compiler, (p, ...args) => {
					handler(0.98, "after emitting", tap.name, ...args);
				});
				handler(0.98, "after emitting", tap.name);
			}
		});
		compiler.hooks.done.tap("ProgressPlugin", () => {
			handler(1, "");
		});
	}
}

ProgressPlugin.defaultOptions = {
	profile: false,
	modulesCount: 500,
	modules: true,
	activeModules: true,
	entries: true
};

module.exports = ProgressPlugin;
