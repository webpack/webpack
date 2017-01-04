"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ModuleDependency = require("./ModuleDependency");
const DepBlockHelpers = require("./DepBlockHelpers");
const WebpackMissingModule = require("./WebpackMissingModule");
class Template {
	apply(dep, source, outputOptions, requestShortener) {
		const depBlock = dep.block;
		const promise = DepBlockHelpers.getDepBlockPromise(depBlock, outputOptions, requestShortener, "import()");
		let comment = "";
		if(outputOptions.pathinfo) {
			comment = `/*! ${requestShortener.shorten(dep.request)} */ `;
		}
		if(promise && dep.module) {
			source.replace(depBlock.range[0], depBlock.range[1] - 1, `${promise}.then(__webpack_require__.bind(null, ${comment}${JSON.stringify(dep.module.id)}))`);
		} else if(dep.module) {
			source.replace(depBlock.range[0], depBlock.range[1] - 1, `Promise.resolve(__webpack_require__(${comment}${JSON.stringify(dep.module.id)}))`);
		} else {
			source.replace(depBlock.range[0], depBlock.range[1] - 1, WebpackMissingModule.promise(dep.request));
		}
	}
}
class ImportDependency extends ModuleDependency {
	constructor(request, block) {
		super(request);
		this.block = block;
	}
}
ImportDependency.Template = Template;
ImportDependency.prototype.type = "import()";
module.exports = ImportDependency;
