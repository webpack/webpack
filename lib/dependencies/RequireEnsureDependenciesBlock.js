/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const RequireEnsureDependency = require("./RequireEnsureDependency");
const serializeTools = require("../util/hydrateDependency");

module.exports = class RequireEnsureDependenciesBlock extends AsyncDependenciesBlock {
	constructor(expr, successExpression, errorExpression, chunkName, chunkNameRange, module, loc) {
		super(chunkName, module, loc);
		this.expr = expr;
		this.successExpression = successExpression;
		this.errorExpression = errorExpression;
		this.chunkNameRange = chunkNameRange;

		const successBodyRange = successExpression && successExpression.body && successExpression.body.range;
		if(successBodyRange) {
			this.range = [successBodyRange[0] + 1, successBodyRange[1] - 1];
		}
		this.chunkNameRange = chunkNameRange;
		const dep = new RequireEnsureDependency(this);
		dep.loc = loc;
		this.addDependency(dep);
	}

	serialize() {
		return {
			path: __filename,
			options: [
				this.expr,
				this.successExpression,
				this.errorExpression,
				this.chunkName,
				this.chunkNameRange,
				"SELF_MODULE_REFERENCE",
				this.loc
			],
			dependencies: serializeTools.serializeArray(this.dependencies),
		};
	}

	hydrate(serializedData, module) {
		serializedData.dependencies.forEach(dep => {
			const dependency = serializeTools.hydrateDependency(dep, this);
			this.addDependency(dependency);
		});
	}
};
