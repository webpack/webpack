/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const RequireEnsureDependency = require("./RequireEnsureDependency");

module.exports = class RequireEnsureDependenciesBlock extends AsyncDependenciesBlock {
	constructor(expr, fnExpression, chunkName, chunkNameRange, module, loc) {
		super(chunkName, module, loc);
		this.expr = expr;
		const bodyRange = fnExpression && fnExpression.body && fnExpression.body.range;
		this.range = bodyRange && [bodyRange[0] + 1, bodyRange[1] - 1] || null;
		this.chunkNameRange = chunkNameRange;
		let dep = new RequireEnsureDependency(this);
		dep.loc = loc;
		this.addDependency(dep);
	}
};
