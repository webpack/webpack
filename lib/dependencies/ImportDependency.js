/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ModuleDependency = require("./ModuleDependency");
const DepBlockHelpers = require("./DepBlockHelpers");
const WebpackMissingModule = require("./WebpackMissingModule");

class ImportDependency extends ModuleDependency {
	constructor(request, block) {
		super(request);
		this.block = block;
	}

	get type() {
		return "import()";
	}
}

ImportDependency.Template = class ImportDependencyTemplate {
	apply(dep, source, outputOptions, requestShortener) {
		const depBlock = dep.block;
		const promise = DepBlockHelpers.getDepBlockPromise(depBlock, outputOptions, requestShortener, "import()");
		let comment = "";
		if(outputOptions.pathinfo) comment = "/*! " + requestShortener.shorten(dep.request) + " */ ";
		if(promise && dep.module) {
			source.replace(depBlock.range[0], depBlock.range[1] - 1, promise + ".then(__webpack_require__.bind(null, " + comment + JSON.stringify(dep.module.id) + "))");
			return;
		}

		if(dep.module) {
			source.replace(depBlock.range[0], depBlock.range[1] - 1, "Promise.resolve(__webpack_require__(" + comment + JSON.stringify(dep.module.id) + "))");
			return;
		}

		source.replace(depBlock.range[0], depBlock.range[1] - 1, WebpackMissingModule.promise(dep.request));
	}
}

module.exports = ImportDependency;
