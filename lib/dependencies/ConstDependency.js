"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const NullDependency = require("./NullDependency");
class Template {
	apply(dep, source) {
		if(typeof dep.range === "number") {
			source.insert(dep.range, dep.expression);
		} else {
			source.replace(dep.range[0], dep.range[1] - 1, dep.expression);
		}
	}
}
class ConstDependency extends NullDependency {
	constructor(expression, range) {
		super();
		this.expression = expression;
		this.range = range;
	}

	updateHash(hash) {
		hash.update(`${this.range}`);
		hash.update(`${this.expression}`);
	}
}
ConstDependency.Template = Template;
module.exports = ConstDependency;
