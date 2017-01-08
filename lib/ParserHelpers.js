/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ParserHelpers = exports;

ParserHelpers.addParsedVariableToModule = function(parser, name, expression) {
	if(!parser.state.current.addVariable) return false;
	var deps = [];
	parser.parse(expression, {
		current: {
			addDependency: function(dep) {
				dep.userRequest = name;
				deps.push(dep);
			}
		},
		module: parser.state.module
	});
	parser.state.current.addVariable(name, expression, deps);
	return true;
};
