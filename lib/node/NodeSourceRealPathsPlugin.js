/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function NodeSourceRealPathsPlugin() {
}
module.exports = NodeSourceRealPathsPlugin;
NodeSourceRealPathsPlugin.prototype.apply = function(compiler) {
	compiler.parser.plugin("expression __filename", function(expr) {
		if(!this.state.module) return false;
		this.state.current.addVariable("__filename", JSON.stringify(this.state.module.resource));
		return true;
	});
	compiler.parser.plugin("expression __dirname", function(expr) {
		if(!this.state.module) return false;
		this.state.current.addVariable("__dirname", JSON.stringify(this.state.module.context));
		return true;
	});
};