/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function MovedToPluginWarningPlugin(optionName, pluginName) {
	this.optionName = optionName;
	this.pluginName = pluginName;
}
module.exports = MovedToPluginWarningPlugin;

MovedToPluginWarningPlugin.prototype.apply = function(compiler) {
	var optionName = this.optionName;
	var pluginName = this.pluginName;
	compiler.plugin("compilation", function(compilation) {
		compilation.warnings.push(new Error("webpack options:\nDEPRECATED option '" + optionName + "' will be moved to the " + pluginName + ". " +
			"Use this instead.\n" +
			"For more info about the usage of the " + pluginName + " see https://webpack.github.io/docs/list-of-plugins.html"));
	});
};
