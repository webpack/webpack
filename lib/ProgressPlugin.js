/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ProgressPlugin(handler) {
	this.handler = handler;
}
module.exports = ProgressPlugin;

ProgressPlugin.prototype.apply = function(compiler) {
	var handler = this.handler || defaultHandler;
	if(compiler.compilers) {
		var states = new Array(compiler.compilers.length);
		compiler.compilers.forEach(function(compiler, idx) {
			compiler.apply(new ProgressPlugin(function(p, msg) {
				states[idx] = [p, msg];
				handler(states.map(function(state) {
					return state && state[0] || 0;
				}).reduce(function(a, b) {
					return a + b;
				}) / states.length, states.map(function(state) {
					return state && state[1];
				}).filter(Boolean).join(" | "));
			}));
		});
	} else {
		var lastModulesCount = 0;
		var moduleCount = 1;
		var doneModules = 0;

		function update() {
			handler(0.1 + (doneModules / Math.max(lastModulesCount, moduleCount)) * 0.6, doneModules + "/" + moduleCount + " build modules");
		}
		compiler.plugin("compilation", function(compilation) {
			if(compilation.compiler.isChild()) return;
			lastModulesCount = moduleCount;
			moduleCount = 0;
			doneModules = 0;
			handler(0, "compile");
			compilation.plugin("build-module", function() {
				moduleCount++;
				update();
			});
			compilation.plugin("succeed-module", function() {
				doneModules++;
				update();
			});
			compilation.plugin("seal", function() {
				handler(0.71, "seal");
			});
			compilation.plugin("optimize", function() {
				handler(0.73, "optimize");
			});
			compilation.plugin("before-hash", function() {
				handler(0.75, "hashing");
			});
			compilation.plugin("before-chunk-assets", function() {
				handler(0.76, "create chunk assets");
			});
			compilation.plugin("additional-chunk-assets", function() {
				handler(0.78, "additional chunk assets");
			});
			compilation.plugin("optimize-chunk-assets", function(chunks, callback) {
				handler(0.8, "optimize chunk assets");
				callback();
			});
			compilation.plugin("optimize-assets", function(assets, callback) {
				handler(0.9, "optimize assets");
				callback();
			});
		});
		compiler.plugin("emit", function(compilation, callback) {
			handler(0.95, "emit");
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

		if(percentage < 1) {
			percentage = Math.floor(percentage * 100);
			msg = percentage + "% " + msg;
			if(percentage < 100) {
				msg = " " + msg;
			}
			if(percentage < 10) {
				msg = " " + msg;
			}
		}
		if(compiler.options.profile) {
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
};
