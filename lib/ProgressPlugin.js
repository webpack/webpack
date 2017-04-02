/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

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
		const handler = this.handler || defaultHandler;
		const profile = this.profile;
		if(compiler.compilers) {
			const states = new Array(compiler.compilers.length);
			compiler.compilers.forEach(function(compiler, idx) {
				compiler.apply(new ProgressPlugin(function(p, msg) {
					states[idx] = Array.prototype.slice.apply(arguments);
					handler.apply(null, [
						states.map(state => state && state[0] || 0).reduce((a, b) => a + b) / states.length,
						`[${idx}] ${msg}`
					].concat(Array.prototype.slice.call(arguments, 2)));
				}));
			});
		} else {
			let lastModulesCount = 0;
			let moduleCount = 500;
			let doneModules = 0;
			const activeModules = [];

			const update = function update(module) {
				handler(
					0.1 + (doneModules / Math.max(lastModulesCount, moduleCount)) * 0.6,
					"building modules",
					`${doneModules}/${moduleCount} modules`,
					`${activeModules.length} active`,
					activeModules[activeModules.length - 1]
				);
			};

			const moduleDone = function moduleDone(module) {
				doneModules++;
				const ident = module.identifier();
				if(ident) {
					const idx = activeModules.indexOf(ident);
					if(idx >= 0) activeModules.splice(idx, 1);
				}
				update();
			};
			compiler.plugin("compilation", function(compilation) {
				if(compilation.compiler.isChild()) return;
				lastModulesCount = moduleCount;
				moduleCount = 0;
				doneModules = 0;
				handler(0, "compiling");
				compilation.plugin("build-module", function(module) {
					moduleCount++;
					const ident = module.identifier();
					if(ident) {
						activeModules.push(ident);
					}
					update();
				});
				compilation.plugin("failed-module", moduleDone);
				compilation.plugin("succeed-module", moduleDone);
				const syncHooks = {
					"seal": [0.71, "sealing"],
					"optimize": [0.72, "optimizing"],
					"optimize-modules-basic": [0.73, "basic module optimization"],
					"optimize-modules": [0.74, "module optimization"],
					"optimize-modules-advanced": [0.75, "advanced module optimization"],
					"optimize-chunks-basic": [0.76, "basic chunk optimization"],
					"optimize-chunks": [0.77, "chunk optimization"],
					"optimize-chunks-advanced": [0.78, "advanced chunk optimization"],
					// optimize-tree
					"revive-modules": [0.80, "module reviving"],
					"optimize-module-order": [0.81, "module order optimization"],
					"optimize-module-ids": [0.82, "module id optimization"],
					"revive-chunks": [0.83, "chunk reviving"],
					"optimize-chunk-order": [0.84, "chunk order optimization"],
					"optimize-chunk-ids": [0.85, "chunk id optimization"],
					"before-hash": [0.86, "hashing"],
					"before-module-assets": [0.87, "module assets processing"],
					"before-chunk-assets": [0.88, "chunk assets processing"],
					"additional-chunk-assets": [0.89, "additional chunk assets processing"],
					"record": [0.90, "recording"]
				};
				Object.keys(syncHooks).forEach(name => {
					let pass = 0;
					const settings = syncHooks[name];
					compilation.plugin(name, () => {
						if(pass++ > 0)
							handler(settings[0], settings[1], `pass ${pass}`);
						else
							handler(settings[0], settings[1]);
					});
				});
				compilation.plugin("optimize-tree", (chunks, modules, callback) => {
					handler(0.79, "module and chunk tree optimization");
					callback();
				});
				compilation.plugin("additional-assets", callback => {
					handler(0.91, "additional asset processing");
					callback();
				});
				compilation.plugin("optimize-chunk-assets", (chunks, callback) => {
					handler(0.92, "chunk asset optimization");
					callback();
				});
				compilation.plugin("optimize-assets", (assets, callback) => {
					handler(0.94, "asset optimization");
					callback();
				});
			});
			compiler.plugin("emit", (compilation, callback) => {
				handler(0.95, "emitting");
				callback();
			});
			compiler.plugin("done", () => {
				handler(1, "");
			});
		}

		let lineCaretPosition = 0,
			lastState, lastStateTime;

		function defaultHandler(percentage, msg) {
			let state = msg;
			const details = Array.prototype.slice.call(arguments, 2);
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
					lastStateTime = +new Date();
				} else if(state !== lastState || percentage === 1) {
					const now = +new Date();
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
		}

		function goToLineStart(nextMessage) {
			let str = "";
			for(; lineCaretPosition > nextMessage.length; lineCaretPosition--) {
				str += "\b \b";
			}
			for(var i = 0; i < lineCaretPosition; i++) {
				str += "\b";
			}
			lineCaretPosition = nextMessage.length;
			if(str) process.stderr.write(str);
		}
	}
}
module.exports = ProgressPlugin;
