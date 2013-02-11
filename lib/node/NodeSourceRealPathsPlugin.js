/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");

function NodeSourceRealPathsPlugin(context, onlyIfInContext) {
	this.context = context;
	this.onlyIfInContext = onlyIfInContext;
}
module.exports = NodeSourceRealPathsPlugin;
NodeSourceRealPathsPlugin.prototype.apply = function(compiler) {
	var context = this.context;
	var onlyIfInContext = this.onlyIfInContext;
	compiler.parser.plugin("expression __filename", function(expr) {
		if(!this.state.module) return;
		if(onlyIfInContext && this.state.module.resource.indexOf(context) != 0) return;
		this.state.current.addVariable("__filename", JSON.stringify(
			context ? path.relative(context, this.state.module.resource) : this.state.module.resource
		));
		return true;
	});
	compiler.parser.plugin("expression __dirname", function(expr) {
		if(!this.state.module) return;
		if(onlyIfInContext && this.state.module.context.indexOf(context) != 0) return;
		this.state.current.addVariable("__dirname", JSON.stringify(
			context ? path.relative(context, this.state.module.context) : this.state.module.context
		));
		return true;
	});
};