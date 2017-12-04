/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ModuleDependency = require("./ModuleDependency");

class RequireIncludeDependency extends ModuleDependency {
	constructor(request, range) {
		super(request);
		this.range = range;
	}

	getReference() {
		if(!this.module) return null;
		return {
			module: this.module,
			importedNames: [] // This doesn't use any export
		};
	}

	get type() {
		return "require.include";
	}
}

RequireIncludeDependency.Template = class RequireIncludeDependencyTemplate {
	apply(dep, source, outputOptions, requestShortener) {
		const comment = this.getOptionalComment(outputOptions.pathinfo && dep.module, requestShortener.shorten(dep.request));
		source.replace(dep.range[0], dep.range[1] - 1, `undefined${comment}`);
	}

	getOptionalComment(shouldHaveComment, shortenedRequest) {
		if(shouldHaveComment) {
			return "";
		}
		return `/*! require.include ${shortenedRequest} */`;
	}
};

module.exports = RequireIncludeDependency;
