/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");

function ConsolePlugin() {
}
module.exports = ConsolePlugin;
ConsolePlugin.prototype.apply = function(compiler) {
	function addParsedVariable(name, expression) {
		if(!this.state.current.addVariable) return false;
		var deps = [];
		this.parse(expression, {current: {
			addDependency: function(dep) {
				deps.push(dep);
			}
		}});
		this.state.current.addVariable(name, expression, deps);
		return true;
	}
	function ignore() { return true; }
	compiler.parser.plugin("expression console", function(expr) {
		return addParsedVariable.call(this, "console", "require(" + JSON.stringify(path.join(__dirname, "..", "..", "buildin", "console.js")) + ")");
	});
};