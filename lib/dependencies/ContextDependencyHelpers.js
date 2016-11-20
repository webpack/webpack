/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ContextDependencyHelpers = exports;

function parseTemplateLiteral(node) {
	var nodes = [];
	node.quasis.forEach(function(quasi) {
		nodes.push(quasi.value.cooked);
	});
	var prefix = nodes[0];
	var postfix = nodes.length > 1 ? nodes[nodes.length - 1] : '';
	return {
		prefix: prefix,
		postfix: postfix,
		range: [node.start, node.end]
	}
}

ContextDependencyHelpers.create = function(Dep, range, param, expr, options) {
	var dep, prefix, postfix, valueRange, prefixRange, idx, context, regExp;
	if(param.isWrapped() && (param.prefix && param.prefix.isString() || param.postfix && param.postfix.isString())) {
		prefix = param.prefix && param.prefix.isString() ? param.prefix.string : "";
		postfix = param.postfix && param.postfix.isString() ? param.postfix.string : "";
		prefixRange = param.prefix && param.prefix.isString() ? param.prefix.range : null;
		valueRange = [prefixRange ? prefixRange[1] : param.range[0], param.range[1]];
	} else if (expr.arguments && expr.arguments.length && expr.arguments[0] && expr.arguments[0].type === 'TemplateLiteral') {
		var parsed = parseTemplateLiteral(expr.arguments[0]);
		prefix = parsed.prefix;
		postfix = parsed.postfix;
		valueRange = parsed.range;
	} else {
		dep = new Dep(options.exprContextRequest, options.exprContextRecursive, options.exprContextRegExp, range, param.range);
		dep.loc = expr.loc;
		dep.critical = options.exprContextCritical && "the request of a dependency is an expression";
		return dep;
	}

	idx = prefix.lastIndexOf("/");
	context = ".";
	if(idx >= 0) {
		context = prefix.substr(0, idx);
		prefix = "." + prefix.substr(idx);
	}
	regExp = new RegExp("^" +
		prefix.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") +
		options.wrappedContextRegExp.source +
		postfix.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") + "$");
	dep = new Dep(context, options.wrappedContextRecursive, regExp, range, valueRange);
	dep.loc = expr.loc;
	dep.prepend = param.prefix && param.prefix.isString() ? prefix : null;
	dep.critical = options.wrappedContextCritical && "a part of the request of a dependency is an expression";
	return dep;
};
