/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConstDependency = require("./ConstDependency");
var ParserHelpers = require("../ParserHelpers");

function SystemPlugin(options) {
	this.options = options;
}
module.exports = SystemPlugin;

SystemPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		params.normalModuleFactory.plugin("parser", function(parser, parserOptions) {

			if(typeof parserOptions.system !== "undefined" && !parserOptions.system)
				return;

			function setNotSupported(name) {
				parser.plugin("evaluate typeof " + name, ParserHelpers.evaluateToString("undefined"));
				parser.plugin("expression " + name,
					ParserHelpers.expressionIsUnsupported(name + " is not supported by webpack.")
				);
			}

			parser.plugin("typeof System", ParserHelpers.toConstantDependency("object"));
			parser.plugin("evaluate typeof System", ParserHelpers.evaluateToString("object"));

			parser.plugin("typeof System.import", ParserHelpers.toConstantDependency("function"));
			parser.plugin("evaluate typeof System.import", ParserHelpers.evaluateToString("function"));

			setNotSupported("System.set");
			setNotSupported("System.get");
			setNotSupported("System.register");
			parser.plugin("expression System", function(expr) {
				var dep = new ConstDependency("{}", expr.range);
				dep.loc = expr.loc;
				this.state.current.addDependency(dep);
				return true;
			});
		});
	});
};
