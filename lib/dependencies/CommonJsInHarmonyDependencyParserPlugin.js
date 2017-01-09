/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var CommonJsInHarmonyDependency = require("./CommonJsInHarmonyDependency");

function CommonJsInHarmonyDependencyParserPlugin() {}

module.exports = CommonJsInHarmonyDependencyParserPlugin;

CommonJsInHarmonyDependencyParserPlugin.prototype.apply = function(parser) {
	parser.plugin("expression module.exports", function(expr) {
		var dep = new CommonJsInHarmonyDependency(this.state.module, "module.exports");
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
	});
	parser.plugin("expression module", function(expr) {
		var dep = new CommonJsInHarmonyDependency(this.state.module, "module");
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
	});
	parser.plugin("call define", function(expr) {
		var dep = new CommonJsInHarmonyDependency(this.state.module, "define");
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
	});
	parser.plugin("expression define", function(expr) {
		var dep = new CommonJsInHarmonyDependency(this.state.module, "define");
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
	});
	parser.plugin("expression exports", function(expr) {
		var dep = new CommonJsInHarmonyDependency(this.state.module, "exports");
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
	});
};
