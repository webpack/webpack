/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("../WebpackError");
const {
	evaluateToString,
	toConstantDependency
} = require("../javascript/JavascriptParserHelpers");
const makeSerializable = require("../util/makeSerializable");
const RequireIncludeDependency = require("./RequireIncludeDependency");

module.exports = class RequireIncludeDependencyParserPlugin {
	constructor(warn) {
		this.warn = warn;
	}
	apply(parser) {
		const { warn } = this;
		parser.hooks.call
			.for("require.include")
			.tap("RequireIncludeDependencyParserPlugin", expr => {
				if (expr.arguments.length !== 1) return;
				const param = parser.evaluateExpression(expr.arguments[0]);
				if (!param.isString()) return;

				if (warn) {
					parser.state.module.addWarning(
						new RequireIncludeDeprecationWarning(expr.loc)
					);
				}

				const dep = new RequireIncludeDependency(param.string, expr.range);
				dep.loc = expr.loc;
				parser.state.current.addDependency(dep);
				return true;
			});
		parser.hooks.evaluateTypeof
			.for("require.include")
			.tap("RequireIncludePlugin", expr => {
				if (warn) {
					parser.state.module.addWarning(
						new RequireIncludeDeprecationWarning(expr.loc)
					);
				}
				return evaluateToString("function")(expr);
			});
		parser.hooks.typeof
			.for("require.include")
			.tap("RequireIncludePlugin", expr => {
				if (warn) {
					parser.state.module.addWarning(
						new RequireIncludeDeprecationWarning(expr.loc)
					);
				}
				return toConstantDependency(parser, JSON.stringify("function"))(expr);
			});
	}
};

class RequireIncludeDeprecationWarning extends WebpackError {
	constructor(loc) {
		super("require.include() is deprecated and will be removed soon.");

		this.name = "RequireIncludeDeprecationWarning";

		this.loc = loc;
	}
}

makeSerializable(
	RequireIncludeDeprecationWarning,
	"webpack/lib/dependencies/RequireIncludeDependencyParserPlugin",
	"RequireIncludeDeprecationWarning"
);
