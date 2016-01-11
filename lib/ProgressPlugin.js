/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ProgressPlugin(options) {
	if(typeof options === "function") {
		options = {
			handler: options
		};
	}
	options = options || {};
	this.profile = options.profile;
	this.handler = options.handler;
}
module.exports = ProgressPlugin;

ProgressPlugin.prototype.apply = function(compiler) {
	var handler = this.handler || defaultHandler;
	var profile = this.profile;
	if(compiler.compilers) {
		var states = new Array(compiler.compilers.length);
		compiler.compilers.forEach(function(compiler, idx) {
			compiler.apply(new ProgressPlugin(function(p, msg) {
				states[idx] = Array.prototype.slice.apply(arguments);
				handler.apply(null, [
					states.map(function(state) {
						return state && state[0] || 0;
					}).reduce(function(a, b) {
						return a + b;
					}) / states.length,
					"[" + idx + "] " + msg
				].concat(Array.prototype.slice.call(arguments, 2)));
			}));
		});
	} else {
		var lastModulesCount = 0;
		var moduleCount = 500;
		var doneModules = 0;
		var activeModules = [];

		function update(module) {
			handler(
				0.1 + (doneModules / Math.max(lastModulesCount, moduleCount)) * 0.6,
				"building modules",
				doneModules + "/" + moduleCount + " modules",
				activeModules.length + " active",
				activeModules[activeModules.length - 1]
			);
		}

		function moduleDone(module) {
			doneModules++;
			var ident = module.identifier();
			if(ident) {
				var idx = activeModules.indexOf(ident);
				if(idx >= 0) activeModules.splice(idx, 1);
			}
			update();
		}
		compiler.plugin("compilation", function(compilation) {
			if(compilation.compiler.isChild()) return;
			lastModulesCount = moduleCount;
			moduleCount = 0;
			doneModules = 0;
			handler(0, "compiling");
			compilation.plugin("build-module", function(module) {
				moduleCount++;
				var ident = module.identifier();
				if(ident) {
					activeModules.push(ident);
				}
				update();
			});
			compilation.plugin("failed-module", moduleDone);
			compilation.plugin("succeed-module", moduleDone);
			var syncHooks = {
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
			Object.keys(syncHooks).forEach(function(name) {
				var pass = 0;
				var settings = syncHooks[name];
				compilation.plugin(name, function() {
					if(pass++ > 0)
						handler(settings[0], settings[1], "pass " + pass);
					else
						handler(settings[0], settings[1]);
				});
			});
			compilation.plugin("optimize-tree", function(chunks, modules, callback) {
				handler(0.79, "module and chunk tree optimization");
				callback();
			});
			compilation.plugin("additional-assets", function(callback) {
				handler(0.91, "additional asset processing");
				callback();
			});
			compilation.plugin("optimize-chunk-assets", function(chunks, callback) {
				handler(0.92, "chunk asset optimization");
				callback();
			});
			compilation.plugin("optimize-assets", function(assets, callback) {
				handler(0.94, "asset optimization");
				callback();
			});
		});
		compiler.plugin("emit", function(compilation, callback) {
			handler(0.95, "emitting");
			callback();
		});
		compiler.plugin("done", function() {
			handler(1, "");
		});
	}

	var chars = 0,
		lastState, lastStateTime;

	function defaultHandler(percentage, msg) {
		var state = msg;
		var details = Array.prototype.slice.call(arguments, 2);
		if(percentage < 1) {
			percentage = Math.floor(percentage * 100);
			msg = percentage + "% " + msg;
			if(percentage < 100) {
				msg = " " + msg;
			}
			if(percentage < 10) {
				msg = " " + msg;
			}
			details.forEach(function(detail) {
				if(!detail) return;
				if(detail.length > 40) {
					detail = "..." + detail.substr(detail.length - 37);
				}
				msg += " " + detail
			});
		}
		if(profile) {
			state = state.replace(/^\d+\/\d+\s+/, "");
			if(percentage === 0) {
				lastState = null;
				lastStateTime = +new Date();
			} else if(state !== lastState || percentage === 1) {
				var now = +new Date();
				if(lastState) {
					var stateMsg = (now - lastStateTime) + "ms " + lastState;
					goToLineStart(stateMsg);
					process.stderr.write(stateMsg + "\n");
					chars = 0;
				}
				lastState = state;
				lastStateTime = now;
			}
		}
		goToLineStart(msg);
		process.stderr.write(msg);
	}

	function goToLineStart(nextMessage) {
		var str = "";
		for(; chars > nextMessage.length; chars--) {
			str += "\b \b";
		}
		chars = nextMessage.length;
		for(var i = 0; i < chars; i++) {
			str += "\b";
		}
		if(str) process.stderr.write(str);
	}
};
