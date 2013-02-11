/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");

function NodeSourceRealPathsPlugin(context) {
	this.context = context;
}
module.exports = NodeSourceRealPathsPlugin;
NodeSourceRealPathsPlugin.prototype.apply = function(compiler) {
	var context = this.context;
	compiler.parser.plugin("expression __filename", function(expr) {
		if(!this.state.module) return false;
		this.state.current.addVariable("__filename", JSON.stringify(
			context ? path.relative(context, this.state.module.resource) : this.state.module.resource
		));
		return true;
	});
	compiler.parser.plugin("expression __dirname", function(expr) {
		if(!this.state.module) return false;
		this.state.current.addVariable("__dirname", JSON.stringify(
			context ? path.relative(context, this.state.module.context) : this.state.module.context
		));
		return true;
	});
};