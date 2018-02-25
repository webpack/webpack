/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const createDefaultHandler = profile => {
	let lineCaretPosition = 0;
	let lastState;
	let lastStateTime;

	const defaultHandler = (percentage, msg, ...args) => {
		let state = msg;
		const details = args;
		if (percentage < 1) {
			percentage = Math.floor(percentage * 100);
			msg = `${percentage}% ${msg}`;
			if (percentage < 100) {
				msg = ` ${msg}`;
			}
			if (percentage < 10) {
				msg = ` ${msg}`;
			}
			for (let detail of details) {
				if (!detail) continue;
				if (detail.length > 40) {
					detail = `...${detail.substr(detail.length - 37)}`;
				}
				msg += ` ${detail}`;
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
		goToLineStart(msg);
		process.stderr.write(msg);
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

class ProgressPlugin {
	constructor(options) {
		if (typeof options === "function") {
			options = {
				handler: options
			};
		}
		options = options || {};
		this.profile = options.profile;
		this.handler = options.handler;
	}

	apply(compiler) {
		const handler = this.handler || createDefaultHandler(this.profile);
		if (compiler.compilers) {
			const states = new Array(compiler.compilers.length);
			compiler.compilers.forEach((compiler, idx) => {
				new ProgressPlugin((p, msg, ...args) => {
					states[idx] = args;
					handler(
						states
							.map(state => (state && state[0]) || 0)
							.reduce((a, b) => a + b) / states.length,
						`[${idx}] ${msg}`,
						...args
					);
				}).apply(compiler);
			});
		} else {
			let lastModulesCount = 0;
			let moduleCount = 500;
			let doneModules = 0;
			const activeModules = [];

			const update = module => {
				handler(
					0.1 + doneModules / Math.max(lastModulesCount, moduleCount) * 0.6,
					"building modules",
					`${doneModules}/${moduleCount} modules`,
					`${activeModules.length} active`,
					activeModules[activeModules.length - 1]
				);
			};

			const moduleDone = module => {
				doneModules++;
				const ident = module.identifier();
				if (ident) {
					const idx = activeModules.indexOf(ident);
					if (idx >= 0) activeModules.splice(idx, 1);
				}
				update();
			};
			compiler.hooks.compilation.tap("ProgressPlugin", compilation => {
				if (compilation.compiler.isChild()) return;
				lastModulesCount = moduleCount;
				moduleCount = 0;
				doneModules = 0;
				handler(0, "compiling");
				compilation.hooks.buildModule.tap("ProgressPlugin", module => {
					moduleCount++;
					const ident = module.identifier();
					if (ident) {
						activeModules.push(ident);
					}
					update();
				});
				compilation.hooks.failedModule.tap("ProgressPlugin", moduleDone);
				compilation.hooks.succeedModule.tap("ProgressPlugin", moduleDone);
				const hooks = {
					finishModules: "finish module graph",
					seal: "sealing",
					optimizeDependenciesBasic: "basic dependencies optimization",
					optimizeDependencies: "dependencies optimization",
					optimizeDependenciesAdvanced: "advanced dependencies optimization",
					afterOptimizeDependencies: "after dependencies optimization",
					optimize: "optimizing",
					optimizeModulesBasic: "basic module optimization",
					optimizeModules: "module optimization",
					optimizeModulesAdvanced: "advanced module optimization",
					afterOptimizeModules: "after module optimization",
					optimizeChunksBasic: "basic chunk optimization",
					optimizeChunks: "chunk optimization",
					optimizeChunksAdvanced: "advanced chunk optimization",
					afterOptimizeChunks: "after chunk optimization",
					optimizeTree: "module and chunk tree optimization",
					afterOptimizeTree: "after module and chunk tree optimization",
					optimizeChunkModulesBasic: "basic chunk modules optimization",
					optimizeChunkModules: "chunk modules optimization",
					optimizeChunkModulesAdvanced: "advanced chunk modules optimization",
					afterOptimizeChunkModules: "after chunk modules optimization",
					reviveModules: "module reviving",
					optimizeModuleOrder: "module order optimization",
					advancedOptimizeModuleOrder: "advanced module order optimization",
					beforeModuleIds: "before module ids",
					moduleIds: "module ids",
					optimizeModuleIds: "module id optimization",
					afterOptimizeModuleIds: "module id optimization",
					reviveChunks: "chunk reviving",
					optimizeChunkOrder: "chunk order optimization",
					beforeChunkIds: "before chunk ids",
					optimizeChunkIds: "chunk id optimization",
					afterOptimizeChunkIds: "after chunk id optimization",
					recordModules: "record modules",
					recordChunks: "record chunks",
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
					const percentage = idx / numberOfHooks * 0.25 + 0.7;
					compilation.hooks[name].intercept({
						name: "ProgressPlugin",
						context: true,
						call: () => {
							handler(percentage, title);
						},
						tap: (context, tap) => {
							if (context) {
								// p is percentage from 0 to 1
								// args is any number of messages in a hierarchical matter
								context.reportProgress = (p, ...args) => {
									handler(percentage, title, tap.name, ...args);
								};
							}
							handler(percentage, title, tap.name);
						}
					});
				});
			});
			compiler.hooks.emit.intercept({
				name: "ProgressPlugin",
				context: true,
				call: () => {
					handler(0.95, "emitting");
				},
				tap: (context, tap) => {
					if (context) {
						context.reportProgress = (p, ...args) => {
							handler(0.95, "emitting", tap.name, ...args);
						};
					}
					handler(0.95, "emitting", tap.name);
				}
			});
			compiler.hooks.done.tap("ProgressPlugin", () => {
				handler(1, "");
			});
		}
	}
}
module.exports = ProgressPlugin;
