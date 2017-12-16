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
		if(percentage < 1) {
			percentage = Math.floor(percentage * 100);
			msg = `${percentage}% ${msg}`;
			if(percentage < 100) {
				msg = ` ${msg}`;
			}
			if(percentage < 10) {
				msg = ` ${msg}`;
			}
			details.forEach(detail => {
				if(!detail) return;
				if(detail.length > 40) {
					detail = `...${detail.substr(detail.length - 37)}`;
				}
				msg += ` ${detail}`;
			});
		}
		if(profile) {
			state = state.replace(/^\d+\/\d+\s+/, "");
			if(percentage === 0) {
				lastState = null;
				lastStateTime = Date.now();
			} else if(state !== lastState || percentage === 1) {
				const now = Date.now();
				if(lastState) {
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
		for(; lineCaretPosition > nextMessage.length; lineCaretPosition--) {
			str += "\b \b";
		}
		for(var i = 0; i < lineCaretPosition; i++) {
			str += "\b";
		}
		lineCaretPosition = nextMessage.length;
		if(str) process.stderr.write(str);
	};

	return defaultHandler;

};

class ProgressPlugin {

	constructor(options) {
		if(typeof options === "function") {
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
		if(compiler.compilers) {
			const states = new Array(compiler.compilers.length);
			compiler.compilers.forEach((compiler, idx) => {
				compiler.apply(new ProgressPlugin((p, msg, ...args) => {
					states[idx] = args;
					handler(
						states.map(state => state && state[0] || 0).reduce((a, b) => a + b) / states.length,
						`[${idx}] ${msg}`,
						...args
					);
				}));
			});
		} else {
			let lastModulesCount = 0;
			let moduleCount = 500;
			let doneModules = 0;
			const activeModules = [];

			const update = module => {
				handler(
					0.1 + (doneModules / Math.max(lastModulesCount, moduleCount)) * 0.6,
					"building modules",
					`${doneModules}/${moduleCount} modules`,
					`${activeModules.length} active`,
					activeModules[activeModules.length - 1]
				);
			};

			const moduleDone = module => {
				doneModules++;
				const ident = module.identifier();
				if(ident) {
					const idx = activeModules.indexOf(ident);
					if(idx >= 0) activeModules.splice(idx, 1);
				}
				update();
			};
			compiler.hooks.compilation.tap("ProgressPlugin", (compilation) => {
				if(compilation.compiler.isChild()) return;
				lastModulesCount = moduleCount;
				moduleCount = 0;
				doneModules = 0;
				handler(0, "compiling");
				compilation.hooks.buildModule.tap("ProgressPlugin", module => {
					moduleCount++;
					const ident = module.identifier();
					if(ident) {
						activeModules.push(ident);
					}
					update();
				});
				compilation.hooks.failedModule.tap("ProgressPlugin", moduleDone);
				compilation.hooks.succeedModule.tap("ProgressPlugin", moduleDone);
				const hooks = {
					"seal": [0.71, "sealing"],
					"optimize": [0.72, "optimizing"],
					"optimizeModulesBasic": [0.73, "basic module optimization"],
					"optimizeModules": [0.74, "module optimization"],
					"optimizeModulesAdvanced": [0.75, "advanced module optimization"],
					"optimizeChunksBasic": [0.76, "basic chunk optimization"],
					"optimizeChunks": [0.77, "chunk optimization"],
					"optimizeChunksAdvanced": [0.78, "advanced chunk optimization"],
					"optimizeTree": [0.79, "module and chunk tree optimization"],
					"optimizeChunkModules": [0.80, "chunk modules optimization"],
					"optimizeChunkModulesAdvanced": [0.81, "advanced chunk modules optimization"],
					"reviveModules": [0.82, "module reviving"],
					"optimizeModuleOrder": [0.83, "module order optimization"],
					"optimizeModuleIds": [0.84, "module id optimization"],
					"reviveChunks": [0.85, "chunk reviving"],
					"optimizeChunkOrder": [0.86, "chunk order optimization"],
					"optimizeChunkIds": [0.87, "chunk id optimization"],
					"beforeHash": [0.88, "hashing"],
					"beforeModuleAssets": [0.89, "module assets processing"],
					"beforeChunkAssets": [0.90, "chunk assets processing"],
					"additionalChunkAssets": [0.91, "additional chunk assets processing"],
					"additionalAssets": [0.91, "additional asset processing"],
					"optimizeChunkAssets": [0.92, "chunk asset optimization"],
					"optimizeAssets": [0.94, "asset optimization"],
					"record": [0.92, "recording"]
				};
				Object.keys(hooks).forEach(name => {
					let pass = 0;
					const settings = hooks[name];
					compilation.hooks[name].tap("ProgressPlugin", () => {
						if(pass++ > 0)
							handler(settings[0], settings[1], `pass ${pass}`);
						else
							handler(settings[0], settings[1]);
					});
				});
			});
			compiler.hooks.emit.tap("ProgressPlugin", () => {
				handler(0.95, "emitting");
			});
			compiler.hooks.done.tap("ProgressPlugin", () => {
				handler(1, "");
			});
		}
	}
}
module.exports = ProgressPlugin;
