/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var BasicEvaluatedExpression = require("./BasicEvaluatedExpression");

function NoHotModuleReplacementPlugin() {
}
module.exports = NoHotModuleReplacementPlugin;

NoHotModuleReplacementPlugin.prototype.apply = function(compiler) {
	compiler.parser.plugin("evaluate Identifier module.hot", function(expr) {
		return new BasicEvaluatedExpression().setBoolean(false).setRange(expr.range);
	});
};
