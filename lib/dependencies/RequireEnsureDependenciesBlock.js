"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const RequireEnsureDependency = require("./RequireEnsureDependency");
class RequireEnsureDependenciesBlock extends AsyncDependenciesBlock {
	constructor(expr, fnExpression, chunkName, chunkNameRange, module, loc) {
		super(chunkName, module, loc);
		this.expr = expr;
		this.chunkNameRange = chunkNameRange;
		const bodyRange = fnExpression && fnExpression.body && fnExpression.body.range;
		this.range = bodyRange && [bodyRange[0] + 1, bodyRange[1] - 1] || null;
		const dep = new RequireEnsureDependency(this);
		dep.loc = loc;
		this.addDependency(dep);
	}
}
module.exports = RequireEnsureDependenciesBlock;
