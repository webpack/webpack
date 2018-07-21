/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ModuleDependency = require("./ModuleDependency");
const webpackMissingPromiseModule = require("./WebpackMissingModule").promise;

class ImportWeakDependency extends ModuleDependency {
	constructor(request, range) {
		super(request);
		this.range = range;
		this.weak = true;
	}

	get type() {
		return "import() weak";
	}
}

ImportWeakDependency.Template = class ImportDependencyTemplate {
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
			return `Promise.resolve(${comment}${stringifiedId}).then(function(id) { if(!__webpack_require__.m[id]) throw new Error("Module '" + id + "' is not available (weak dependency)"); return __webpack_require__(id); })`;
		}

		return webpackMissingPromiseModule(dep.request);
	}
};

module.exports = ImportWeakDependency;
