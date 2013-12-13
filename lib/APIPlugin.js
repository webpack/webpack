/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConstDependency = require("./dependencies/ConstDependency");
var BasicEvaluatedExpression = require("./BasicEvaluatedExpression");

function APIPlugin() {
}
module.exports = APIPlugin;

var REPLACEMENTS = {
	__webpack_public_path__: "require.p",
	__webpack_require__: "require",
	__webpack_modules__: "require.modules",
	__webpack_chunk_load__: "require.e",
};
var REPLACEMENT_TYPES = {
	__webpack_public_path__: "string",
	__webpack_require__: "function",
	__webpack_modules__: "object",
	__webpack_chunk_load__: "function",
};
var IGNORES = [
	"call require.valueOf",
	"expression require.onError",
];
APIPlugin.prototype.apply = function(compiler) {
	Object.keys(REPLACEMENTS).forEach(function(key) {
		compiler.parser.plugin("expression "+key, function(expr) {
			var dep = new ConstDependency(REPLACEMENTS[key], expr.range);
			dep.loc = expr.loc;
			this.state.current.addDependency(dep);
			return true;
		});
		compiler.parser.plugin("evaluate typeof "+key, function(expr) {
			return new BasicEvaluatedExpression().setString(REPLACEMENT_TYPES[key]).setRange(expr.range);
		});
	});
	IGNORES.forEach(function(key) {
		compiler.parser.plugin(key, function(expr) {
			return true;
		});
	});
};