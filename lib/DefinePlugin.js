/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConstDependency = require("./dependencies/ConstDependency");
var BasicEvaluatedExpression = require("./BasicEvaluatedExpression");

function DefinePlugin(definitions) {
	this.definitions = definitions;
}
module.exports = DefinePlugin;
DefinePlugin.prototype.apply = function(compiler) {
	(function walkDefinitions(definitions, prefix) {
		Object.keys(definitions).forEach(function(key) {
			var code = definitions[key];
			if(code === undefined || code === null) code = code + "";
			else if(typeof code === "object") {
				walkDefinitions(code, key + ".");
				applyObjectDefine(key, code);
				return;
			}
			else code = code.toString();
			applyDefine(prefix + key, code);
		});
	}(this.definitions, ""));
	function applyDefine(key, code) {
		var recurse = false;
		var recurseTypeof = false;
		compiler.parser.plugin("rename " + key, function(expr) {
			return true;
		});
		compiler.parser.plugin("evaluate Identifier " + key, function(expr) {
			if(recurse) return;
			recurse = true;
			var res = compiler.parser.evaluate(code);
			recurse = false;
			res.setRange(expr.range);
			return res;
		});
		compiler.parser.plugin("evaluate typeof " + key, function(expr) {
			if(recurseTypeof) return;
			recurseTypeof = true;
			var res = compiler.parser.evaluate("typeof (" + code + ")");
			recurseTypeof = false;
			res.setRange(expr.range);
			return res;
		});
		compiler.parser.plugin("expression " + key, function(expr) {
			var dep = new ConstDependency("("+code+")", expr.range);
			dep.loc = expr.loc;
			this.state.current.addDependency(dep);
			return true;
		});
		compiler.parser.plugin("typeof " + key, function(expr) {
			var res = compiler.parser.evaluate("typeof (" + code + ")");
			if(!res.isString()) return;
			var dep = new ConstDependency(JSON.stringify(res.string), expr.range);
			dep.loc = expr.loc;
			this.state.current.addDependency(dep);
			return true;
		});
	}
	function applyObjectDefine(key, obj) {
		var code = "{" + Object.keys(obj).map(function(key) {
			var code = obj[key];
			if(typeof code !== "string" && code.toString) code = code.toString();
			else if(typeof code !== "string") code = code + "";
			return JSON.stringify(key) + ":" + code;
		}).join(",") + "}";
		compiler.parser.plugin("rename " + key, function(expr) {
			return true;
		});
		compiler.parser.plugin("evaluate Identifier " + key, function(expr) {
			return new BasicEvaluatedExpression().setRange(expr.range);
		});
		compiler.parser.plugin("evaluate typeof " + key, function(expr) {
			return new BasicEvaluatedExpression().setString("object").setRange(expr.range);
		});
		compiler.parser.plugin("expression " + key, function(expr) {
			var dep = new ConstDependency("("+code+")", expr.range);
			dep.loc = expr.loc;
			this.state.current.addDependency(dep);
			return true;
		});
		compiler.parser.plugin("typeof " + key, function(expr) {
			var dep = new ConstDependency("\"object\"", expr.range);
			dep.loc = expr.loc;
			this.state.current.addDependency(dep);
			return true;
		});
	}
};