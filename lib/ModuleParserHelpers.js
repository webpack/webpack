"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
function addParsedVariable(parser, name, expression) {
	if(!parser.state.current.addVariable) {
		return false;
	}
	const deps = [];
	parser.parse(expression, {
		current: {
			addDependency(dep) {
				dep.userRequest = name;
				deps.push(dep);
			}
		},
		module: parser.state.module
	});
	parser.state.current.addVariable(name, expression, deps);
	return true;
}
exports.addParsedVariable = addParsedVariable;
