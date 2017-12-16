/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConstDependency = require("./dependencies/ConstDependency");

class UseStrictPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("UseStrictPlugin", (compilation, {
			normalModuleFactory
		}) => {
			normalModuleFactory.plugin(["parser javascript/auto", "parser javascript/dynamic", "parser javascript/esm"], (parser) => {
				const parserInstance = parser;
				parser.plugin("program", (ast) => {
					const firstNode = ast.body[0];
					if(firstNode &&
						firstNode.type === "ExpressionStatement" &&
						firstNode.expression.type === "Literal" &&
						firstNode.expression.value === "use strict") {
						// Remove "use strict" expression. It will be added later by the renderer again.
						// This is necessary in order to not break the strict mode when webpack prepends code.
						// @see https://github.com/webpack/webpack/issues/1970
						const dep = new ConstDependency("", firstNode.range);
						dep.loc = firstNode.loc;
						parserInstance.state.current.addDependency(dep);
						parserInstance.state.module.buildInfo.strict = true;
					}
				});
			});
		});
	}
}

module.exports = UseStrictPlugin;
