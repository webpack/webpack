/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const InitFragment = require("../InitFragment");
const NullDependency = require("./NullDependency");

class CachedConstDependency extends NullDependency {
	constructor(expression, range, identifier) {
		super();
		this.expression = expression;
		this.range = range;
		this.identifier = identifier;
	}

	updateHash(hash) {
		hash.update(this.identifier + "");
		hash.update(this.range + "");
		hash.update(this.expression + "");
	}
}

CachedConstDependency.Template = class CachedConstDependencyTemplate {
	apply(dep, source) {
		if (typeof dep.range === "number") {
			source.insert(dep.range, dep.identifier);
			return;
		}

		source.replace(dep.range[0], dep.range[1] - 1, dep.identifier);
	}

	getInitFragments(dep, source, runtime) {
		return [
			new InitFragment(
				`var ${dep.identifier} = ${dep.expression};\n`,
				1,
				`const ${dep.identifier}`
			)
		];
	}
};

module.exports = CachedConstDependency;
