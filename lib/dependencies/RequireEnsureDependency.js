/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const NullDependency = require("./NullDependency");
const DepBlockHelpers = require("./DepBlockHelpers");

class RequireEnsureDependency extends NullDependency {
	constructor(block) {
		super();
		this.block = block;
	}

	get type() {
		return "require.ensure";
	}
}

RequireEnsureDependency.Template = class RequireEnsureDependencyTemplate {
	apply(dep, source, outputOptions, requestShortener) {
		const depBlock = dep.block;
		const wrapper = DepBlockHelpers.getLoadDepBlockWrapper(depBlock, outputOptions, requestShortener, "require.ensure");
		const startBlock = wrapper[0] + "(";
		const endBlock = `).bind(null, __webpack_require__)${wrapper[1]}__webpack_require__.oe${wrapper[2]}`;
		source.replace(depBlock.expr.range[0], depBlock.expr.arguments[1].range[0] - 1, startBlock);
		source.replace(depBlock.expr.arguments[1].range[1], depBlock.expr.range[1] - 1, endBlock);
	}
};

module.exports = RequireEnsureDependency;
