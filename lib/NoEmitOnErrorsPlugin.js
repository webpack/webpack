/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function NoEmitOnErrorsPlugin() {}

module.exports = NoEmitOnErrorsPlugin;
NoEmitOnErrorsPlugin.prototype.apply = function(compiler) {
	compiler.plugin("should-emit", function(compilation) {
		if(compilation.errors.length > 0)
			return false;
	});
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("should-record", function() {
			if(compilation.errors.length > 0)
				return false;
		});
	});
};
