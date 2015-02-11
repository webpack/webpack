/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

// a) require(['a']);
// b) require(['a'], successCallback);
// c) require(['a'], successCallback, errorCallback);

var AMDRequireItemDependency = require("./AMDRequireItemDependency");
var AMDRequireArrayDependency = require("./AMDRequireArrayDependency");
var AMDRequireContextDependency = require("./AMDRequireContextDependency");
var AMDRequireErrorHandlerDependenciesBlock = require("./AMDRequireErrorHandlerDependenciesBlock");
var LocalModuleDependency = require("./LocalModuleDependency");
var ContextDependencyHelpers = require("./ContextDependencyHelpers");
var LocalModulesHelpers = require("./LocalModulesHelpers");

function AMDRequireErrorHandlerDependenciesBlockParserPlugin(options) {
	this.options = options;
}

module.exports = AMDRequireErrorHandlerDependenciesBlockParserPlugin;

AMDRequireErrorHandlerDependenciesBlockParserPlugin.prototype.apply = function(parser) {
	var options = this.options;
	parser.plugin("call require", function(expr) {
		switch(expr.arguments.length) {
		case 1:
			var param = this.evaluateExpression(expr.arguments[0]);
			var result;
			var dep = new AMDRequireErrorHandlerDependenciesBlock(expr, param.range, null, null, this.state.module, expr.loc);
			var old = this.state.current;
			this.state.current = dep;
			this.inScope([], function() {
				result = this.applyPluginsBailResult("call require:amd:array", expr, param);
			}.bind(this));
			this.state.current = old;
			if(!result) return;
			this.state.current.addBlock(dep);
			return true;
		case 2:
		case 3:
			var param = this.evaluateExpression(expr.arguments[0]);
			var successCallback = expr.arguments[1];
			var errorCallback = expr.arguments[2] || {};
			var dep = new AMDRequireErrorHandlerDependenciesBlock(expr, param.range, successCallback.range, errorCallback.range, this.state.module, expr.loc);
			dep.loc = expr.loc;
			var old = this.state.current;
			this.state.current = dep;
			try {
				var result;
				this.inScope([], function() {
					result = this.applyPluginsBailResult("call require:amd:array", expr, param);
				}.bind(this));
				if(!result) return;
				[successCallback, errorCallback].forEach(function(callback) {
					if (callback.type === "FunctionExpression") {
						this.inScope(callback.params.filter(function(i) {
							return ["require", "module", "exports"].indexOf(i.name) < 0;
						}), function() {
							if(callback.body.type === "BlockStatement")
								this.walkStatement(callback.body);
							else
								this.walkExpression(callback.body);
						}.bind(this));
					}
				}.bind(this));
			} finally {
				this.state.current = old;
				this.state.current.addBlock(dep);
			}
			return true;
		}
	});
};

