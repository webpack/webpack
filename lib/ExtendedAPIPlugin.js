/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConstDependency = require("./dependencies/ConstDependency");
var BasicEvaluatedExpression = require("./BasicEvaluatedExpression");

var NullFactory = require("./NullFactory");

function ExtendedAPIPlugin() {}
module.exports = ExtendedAPIPlugin;

var REPLACEMENTS = {
	__webpack_hash__: "__webpack_require__.h" // eslint-disable-line camelcase
};
var REPLACEMENT_TYPES = {
	__webpack_hash__: "string" // eslint-disable-line camelcase
};
ExtendedAPIPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.dependencyFactories.set(ConstDependency, new NullFactory());
		compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
		compilation.mainTemplate.plugin("require-extensions", function(source, chunk, hash) {
			var buf = [source];
			buf.push("");
			buf.push("// __webpack_hash__");
			buf.push(this.requireFn + ".h = " + JSON.stringify(hash) + ";");
			return this.asString(buf);
		});
		compilation.mainTemplate.plugin("global-hash", function() {
			return true;
		});
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
};
