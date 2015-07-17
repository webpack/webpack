/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConstDependency = require("./dependencies/ConstDependency");
var BasicEvaluatedExpression = require("./BasicEvaluatedExpression");

var NullFactory = require("./NullFactory");

function APIPlugin() {}
module.exports = APIPlugin;

var REPLACEMENTS = {
	__webpack_require__: "__webpack_require__", // eslint-disable-line camelcase
	__webpack_public_path__: "__webpack_require__.p", // eslint-disable-line camelcase
	__webpack_modules__: "__webpack_require__.m", // eslint-disable-line camelcase
	__webpack_chunk_load__: "__webpack_require__.e", // eslint-disable-line camelcase
	__non_webpack_require__: "require", // eslint-disable-line camelcase
	"require.onError": "__webpack_require__.oe" // eslint-disable-line camelcase
};
var REPLACEMENT_TYPES = {
	__webpack_public_path__: "string", // eslint-disable-line camelcase
	__webpack_require__: "function", // eslint-disable-line camelcase
	__webpack_modules__: "object", // eslint-disable-line camelcase
	__webpack_chunk_load__: "function" // eslint-disable-line camelcase
};
var IGNORES = [];
APIPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.dependencyFactories.set(ConstDependency, new NullFactory());
		compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
	});
	Object.keys(REPLACEMENTS).forEach(function(key) {
		compiler.parser.plugin("expression " + key, function(expr) {
			var dep = new ConstDependency(REPLACEMENTS[key], expr.range);
			dep.loc = expr.loc;
			this.state.current.addDependency(dep);
			return true;
		});
		compiler.parser.plugin("evaluate typeof " + key, function(expr) {
			return new BasicEvaluatedExpression().setString(REPLACEMENT_TYPES[key]).setRange(expr.range);
		});
	});
	IGNORES.forEach(function(key) {
		compiler.parser.plugin(key, function() {
			return true;
		});
	});
};
