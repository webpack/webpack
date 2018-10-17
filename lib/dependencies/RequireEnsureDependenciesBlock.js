/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const RequireEnsureDependency = require("./RequireEnsureDependency");

module.exports = class RequireEnsureDependenciesBlock extends AsyncDependenciesBlock {
	constructor(
		expr,
		successExpression,
		errorExpression,
		chunkName,
		chunkNameRange,
		loc
	) {
		super(chunkName, loc, null);
		this.expr = expr;
		/** @type {[number, number] | undefined} */
		const successBodyRange =
			successExpression &&
			successExpression.body &&
			successExpression.body.range;
		if (successBodyRange) {
			const range = /** @type {[number, number]} */ ([
				successBodyRange[0] + 1,
				successBodyRange[1] - 1
			]);
			this.range = range;
		}
		this.chunkNameRange = chunkNameRange;
		const dep = new RequireEnsureDependency(this);
		dep.loc = loc;
		this.addDependency(dep);
	}
};
