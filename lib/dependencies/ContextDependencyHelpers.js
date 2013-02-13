/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ContextDependencyHelpers = exports;

ContextDependencyHelpers.create = function(Dep, range, param, expr) {
	if(param.isWrapped() && param.prefix.isString()) {
		var prefix = param.prefix.string;
		var postfix = param.postfix.isString() ? param.postfix.string : "";
		var prefixRange = param.prefix.range;
		var valueRange = [prefixRange[1], param.range[1]];
		var idx = prefix.lastIndexOf("/");
		var context = ".";
		if(idx >= 0) {
			context = prefix.substr(0, idx);
			prefix = "." + prefix.substr(idx);
		}
		var regExp = new RegExp("^" +
			prefix.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") +
			".*" +
			postfix.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") + "$");
		var dep = new Dep(context, true, regExp, range, valueRange);
		dep.loc = expr.loc;
		dep.prepend = prefix;
		return dep;
	} else {
		var dep = new Dep(".", true, /^\.\/.*$/, range, param.range);
		dep.loc = expr.loc;
		dep.critical = true;
		return dep;
	}
};
