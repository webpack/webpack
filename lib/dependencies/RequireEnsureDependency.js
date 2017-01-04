"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const NullDependency = require("./NullDependency");
const DepBlockHelpers = require("./DepBlockHelpers");
class Template {
	apply(dep, source, outputOptions, requestShortener) {
		const depBlock = dep.block;
		const wrapper = DepBlockHelpers.getLoadDepBlockWrapper(depBlock, outputOptions, requestShortener, "require.ensure");
		source.replace(depBlock.expr.range[0], depBlock.expr.arguments[1].range[0] - 1, `${wrapper[0]}(`);
		source.replace(depBlock.expr.arguments[1].range[1], depBlock.expr.range[1] - 1, `).bind(null, __webpack_require__)${wrapper[1]}__webpack_require__.oe${wrapper[2]}`);
	}
}
class RequireEnsureDependency extends NullDependency {
	constructor(block) {
		super();
		this.block = block;
	}
}
RequireEnsureDependency.Template = Template;
RequireEnsureDependency.prototype.type = "require.ensure";
module.exports = RequireEnsureDependency;
