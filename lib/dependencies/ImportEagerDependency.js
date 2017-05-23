/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ModuleDependency = require("./ModuleDependency");
const webpackMissingPromiseModule = require("./WebpackMissingModule").promise;

class ImportEagerDependency extends ModuleDependency {
	constructor(request, range) {
		super(request);
		this.range = range;
	}

	get type() {
		return "import()";
	}
}

ImportEagerDependency.Template = class ImportEagerDependencyTemplate {
	apply(dep, source, outputOptions, requestShortener) {
		const comment = this.getOptionalComment(outputOptions.pathinfo, requestShortener.shorten(dep.request));

		const content = this.getContent(dep, comment);
		source.replace(dep.range[0], dep.range[1] - 1, content);
	}

	getOptionalComment(pathinfo, shortenedRequest) {
		if(!pathinfo) {
			return "";
		}

		return `/*! ${shortenedRequest} */ `;
	}

	getContent(dep, comment) {
		if(dep.module) {
			const stringifiedId = JSON.stringify(dep.module.id);
			return `new Promise(function(resolve) { resolve(__webpack_require__(${comment}${stringifiedId})); })`;
		}

		return webpackMissingPromiseModule(dep.request);
	}
};

module.exports = ImportEagerDependency;
