/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConstDependency = require("./dependencies/ConstDependency");
var BasicEvaluatedExpression = require("./BasicEvaluatedExpression");

var NullFactory = require("./NullFactory");

function DefinePlugin(definitions) {
	this.definitions = definitions;
}
module.exports = DefinePlugin;
DefinePlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		compilation.dependencyFactories.set(ConstDependency, new NullFactory());
		compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
	});
	(function walkDefinitions(definitions, prefix) {
		Object.keys(definitions).forEach(function(key) {
			var code = definitions[key];
			if(code && typeof code === "object" && !(code instanceof RegExp)) {
				walkDefinitions(code, prefix + key + ".");
				applyObjectDefine(prefix + key, code);
				return;
			}
			applyDefineKey(prefix, key);
			applyDefine(prefix + key, code);
		});
	}(this.definitions, ""));
	function stringifyObj(obj) {
		return "{" + Object.keys(obj).map(function(key) {
			var code = obj[key];
			return JSON.stringify(key) + ":" + toCode(code);
		}).join(",") + "}";
	}
	function toCode(code) {
		if(code === null) return "null";
		else if(code === undefined) return "undefined";
		else if(code instanceof RegExp && code.toString) return code.toString();
		else if(typeof code === "function" && code.toString) return code.toString();
		else if(typeof code === "object") return stringifyObj(code);
		else return code + "";
	}
	function applyDefineKey(prefix, key) {
		var splittedKey = key.split(".");
		splittedKey.slice(1).forEach(function(_, i) {
			var fullKey = prefix + splittedKey.slice(0, i+1).join(".");
			compiler.parser.plugin("can-rename " + fullKey, function() { return true; });
		});
	}
	function applyDefine(key, code) {
		var isTypeof = /^typeof\s+/.test(key);
		if(isTypeof) key = key.replace(/^typeof\s+/, "");
		var recurse = false;
		var recurseTypeof = false;
		code = toCode(code);
		if(!isTypeof) {
			compiler.parser.plugin("can-rename " + key, function(expr) {
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
			compiler.parser.plugin("expression " + key, function(expr) {
				var dep = new ConstDependency("("+code+")", expr.range);
				dep.loc = expr.loc;
				this.state.current.addDependency(dep);
				return true;
			});
		}
		var typeofCode = isTypeof ? code : "typeof (" + code + ")";
		compiler.parser.plugin("evaluate typeof " + key, function(expr) {
			if(recurseTypeof) return;
			recurseTypeof = true;
			var res = compiler.parser.evaluate(typeofCode);
			recurseTypeof = false;
			res.setRange(expr.range);
			return res;
		});
		compiler.parser.plugin("typeof " + key, function(expr) {
			var res = compiler.parser.evaluate(typeofCode);
			if(!res.isString()) return;
			var dep = new ConstDependency(JSON.stringify(res.string), expr.range);
			dep.loc = expr.loc;
			this.state.current.addDependency(dep);
			return true;
		});
	}
	function applyObjectDefine(key, obj) {
		var code = stringifyObj(obj);
		compiler.parser.plugin("can-rename " + key, function(expr) {
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
