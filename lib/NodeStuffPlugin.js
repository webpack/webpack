/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var ModuleParserHelpers = require("./ModuleParserHelpers");
var ConstDependency = require("./dependencies/ConstDependency");
var BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
var UnsupportedFeatureWarning = require("./UnsupportedFeatureWarning");

var NullFactory = require("./NullFactory");

function NodeStuffPlugin(options) {
	this.options = options;
}
module.exports = NodeStuffPlugin;
NodeStuffPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.dependencyFactories.set(ConstDependency, new NullFactory());
		compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
	});
	function ignore() { return true; }
	function setConstant(expressionName, value) {
		compiler.parser.plugin("expression " + expressionName, function() {
			this.state.current.addVariable(expressionName, JSON.stringify(value));
			return true;
		});
	}
	function setModuleConstant(expressionName, fn) {
		compiler.parser.plugin("expression " + expressionName, function() {
			this.state.current.addVariable(expressionName, JSON.stringify(fn(this.state.module)));
			return true;
		});
	}
	var context = compiler.context;
	if(this.options.__filename === "mock") {
		setConstant("__filename", "/index.js");
	} else if(this.options.__filename) {
		setModuleConstant("__filename", function(module) {
			return path.relative(context, module.resource);
		});
	}
	compiler.parser.plugin("evaluate Identifier __filename", function(expr) {
		if(!this.state.module) return;
		var res = new BasicEvaluatedExpression();
		res.setString(this.state.module.splitQuery(this.state.module.resource)[0]);
		res.setRange(expr.range);
		return res;
	});
	if(this.options.__dirname === "mock") {
		setConstant("__dirname", "/");
	} else if(this.options.__dirname) {
		setModuleConstant("__dirname", function(module) {
			return path.relative(context, module.context);
		});
	}
	compiler.parser.plugin("evaluate Identifier __dirname", function(expr) {
		if(!this.state.module) return;
		var res = new BasicEvaluatedExpression();
		res.setString(this.state.module.context);
		res.setRange(expr.range);
		return res;
	});
	compiler.parser.plugin("expression require.main", function(expr) {
		var dep = new ConstDependency("__webpack_require__.c[0]", expr.range);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		return true;
	});
	compiler.parser.plugin("expression require.extensions", function(expr) {
		var dep = new ConstDependency("(void 0)", expr.range);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		if(!this.state.module) return;
		this.state.module.warnings.push(new UnsupportedFeatureWarning(this.state.module, "require.extensions is not supported by webpack. Use a loader instead."));
		return true;
	});
	compiler.parser.plugin("expression module.exports", ignore);
	compiler.parser.plugin("expression module.loaded", ignore);
	compiler.parser.plugin("expression module.id", ignore);
	compiler.parser.plugin("evaluate Identifier module.hot", function(expr) {
		return new BasicEvaluatedExpression().setBoolean(false).setRange(expr.range);
	});
	compiler.parser.plugin("expression module", function() {
		return ModuleParserHelpers.addParsedVariable(this, "module", "require(" + JSON.stringify(path.join(__dirname, "..", "buildin", "module.js")) + ")(module)");
	});
};