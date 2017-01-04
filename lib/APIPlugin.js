"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ConstDependency = require("./dependencies/ConstDependency");
const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
const NullFactory = require("./NullFactory");
const REPLACEMENTS = {
	__webpack_require__: "__webpack_require__",
	__webpack_public_path__: "__webpack_require__.p",
	__webpack_modules__: "__webpack_require__.m",
	__webpack_chunk_load__: "__webpack_require__.e",
	__non_webpack_require__: "require",
	__webpack_nonce__: "__webpack_require__.nc",
	"require.onError": "__webpack_require__.oe" // eslint-disable-line camelcase
};
const REPLACEMENT_TYPES = {
	__webpack_public_path__: "string",
	__webpack_require__: "function",
	__webpack_modules__: "object",
	__webpack_chunk_load__: "function",
	__webpack_nonce__: "string" // eslint-disable-line camelcase
};
// todo: this may be useless
const IGNORES = [];
class APIPlugin {
	apply(compiler) {
		compiler.plugin("compilation", function(compilation, params) {
			compilation.dependencyFactories.set(ConstDependency, new NullFactory());
			compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
			params.normalModuleFactory.plugin("parser", function(parser) {
				Object.keys(REPLACEMENTS).forEach(function(key) {
					parser.plugin(`expression ${key}`, function(expr) {
						const dep = new ConstDependency(REPLACEMENTS[key], expr.range);
						dep.loc = expr.loc;
						this.state.current.addDependency(dep);
						return true;
					});
					parser.plugin(`evaluate typeof ${key}`, function(expr) {
						return new BasicEvaluatedExpression()
							.setString(REPLACEMENT_TYPES[key])
							.setRange(expr.range);
					});
				});
				IGNORES.forEach(key => {
					parser.plugin(key, () => true);
				});
			});
		});
	}
}
module.exports = APIPlugin;
