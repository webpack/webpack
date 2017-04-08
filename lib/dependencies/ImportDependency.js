/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ModuleDependency = require("./ModuleDependency");
const DepBlockHelpers = require("./DepBlockHelpers");
const webpackMissingPromiseModule = require("./WebpackMissingModule").promise;

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
		const comment = this.getOptionalComment(outputOptions.pathinfo, requestShortener.shorten(dep.request));

		const content = this.getContent(promise, dep, comment);
		source.replace(depBlock.range[0], depBlock.range[1] - 1, content);
	}

	getOptionalComment(pathinfo, shortenedRequest) {
		if(!pathinfo) {
			return "";
		}

		return `/*! ${shortenedRequest} */ `;
	}

	getContent(promise, dep, comment) {
		if(promise && dep.module) {
			const stringifiedId = JSON.stringify(dep.module.id);
			return `${promise}.then(__webpack_require__.bind(null, ${comment}${stringifiedId}))`;
		}

		if(dep.module) {
			const stringifiedId = JSON.stringify(dep.module.id);
			return `Promise.resolve(__webpack_require__(${comment}${stringifiedId}))`;
		}

		return webpackMissingPromiseModule(dep.request);
	}
};

module.exports = ImportDependency;
