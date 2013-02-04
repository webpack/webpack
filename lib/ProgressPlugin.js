/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ProgressPlugin(handler) {
	this.handler = handler;
}
module.exports = ProgressPlugin;

ProgressPlugin.prototype.apply = function(compiler) {
	var lastModulesCount = 0;
	var moduleCount = 1;
	var doneModules = 0;
	var handler = this.handler;
	function update() {
		handler(0.1 + (doneModules / Math.max(lastModulesCount, moduleCount)) * 0.6, doneModules + "/" + moduleCount + " build modules");
	}
	compiler.plugin("compilation", function(compilation) {
		if(compilation.compiler.isChild()) return;
		lastModulesCount = moduleCount;
		moduleCount = 0;
		doneModules = 0;
		handler(0, "compile");
		compilation.plugin("build-module", function(module) {
			moduleCount++;
			update();
		});
		compilation.plugin("succeed-module", function(module) {
			doneModules++;
			update();
		});
		compilation.plugin("optimize", function() {
			handler(0.75, "optimize");
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
	compiler.plugin("done", function(stats) {
		handler(1, "");
	});
};