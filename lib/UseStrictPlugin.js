/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConstDependency = require("./dependencies/ConstDependency");

var NullFactory = require("./NullFactory");

function UseStrictPlugin() {}
module.exports = UseStrictPlugin;

UseStrictPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		params.normalModuleFactory.plugin("parser", function(parser) {
			parser.plugin("program", function(ast) {
				var firstNode = ast.body[0];
				var dep;
				if(firstNode &&
					firstNode.type === "ExpressionStatement" &&
					firstNode.expression.type === "Literal" &&
					firstNode.expression.value === "use strict") {
					// Remove "use strict" expression. It will be added later by the renderer again.
					// This is necessary in order to not break the strict mode when webpack prepends code.
					// @see https://github.com/webpack/webpack/issues/1970
					dep = new ConstDependency("", firstNode.range);
					dep.loc = firstNode.loc;
					this.state.current.addDependency(dep);
					this.state.module.strict = true;
				}
			});
		})
	})
};
