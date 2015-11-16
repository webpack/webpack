/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ContextDependencyHelpers = exports;

ContextDependencyHelpers.create = function(Dep, range, param, expr, options) {
	if(param.isWrapped() && (param.prefix && param.prefix.isString() || param.postfix && param.postfix.isString())) {
		var prefix = param.prefix && param.prefix.isString() ? param.prefix.string : "";
		var postfix = param.postfix && param.postfix.isString() ? param.postfix.string : "";
		var prefixRange = param.prefix && param.prefix.isString() ? param.prefix.range : null;
		var valueRange = [prefixRange ? prefixRange[1] : param.range[0], param.range[1]];
		var idx = prefix.lastIndexOf("/");
		var context = ".";
		if(idx >= 0) {
			context = prefix.substr(0, idx);
			prefix = "." + prefix.substr(idx);
		}
		var regExp = new RegExp("^" +
			prefix.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") +
			options.wrappedContextRegExp.source +
			postfix.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") + "$");
		var dep = new Dep(context, options.wrappedContextRecursive, regExp, range, valueRange);
		dep.loc = expr.loc;
		dep.prepend = param.prefix && param.prefix.isString() ? prefix : null;
		dep.critical = options.wrappedContextCritical && "a part of the request of a dependency is an expression";
		return dep;
	} else {
		var dep = new Dep(options.exprContextRequest, options.exprContextRecursive, options.exprContextRegExp, range, param.range);
		dep.loc = expr.loc;
		dep.critical = options.exprContextCritical && "the request of a dependency is an expression";
		return dep;
	}
};
