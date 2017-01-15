/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const CommonJsInHarmonyDependency = require("./CommonJsInHarmonyDependency");

class CommonJsInHarmonyDependencyParserPlugin {

	apply(parser) {
		parser.plugin("expression module.exports", (expr) => {
			const dep = new CommonJsInHarmonyDependency(parser.state.module, "module.exports");
			dep.loc = expr.loc;
			parser.state.current.addDependency(dep);
		});
		parser.plugin("expression module", (expr) => {
			const dep = new CommonJsInHarmonyDependency(parser.state.module, "module");
			dep.loc = expr.loc;
			parser.state.current.addDependency(dep);
		});
		parser.plugin("call define", (expr) => {
			const dep = new CommonJsInHarmonyDependency(parser.state.module, "define");
			dep.loc = expr.loc;
			parser.state.current.addDependency(dep);
		});
		parser.plugin("expression define", (expr) => {
			const dep = new CommonJsInHarmonyDependency(parser.state.module, "define");
			dep.loc = expr.loc;
			parser.state.current.addDependency(dep);
		});
		parser.plugin("expression exports", (expr) => {
			const dep = new CommonJsInHarmonyDependency(parser.state.module, "exports");
			dep.loc = expr.loc;
			parser.state.current.addDependency(dep);
		});
	}
}
module.exports = CommonJsInHarmonyDependencyParserPlugin;
