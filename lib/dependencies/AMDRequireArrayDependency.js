/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const Dependency = require("../Dependency");
const Template = require("../Template");
const webpackMissingModuleModule = require("./WebpackMissingModule").module;

class AMDRequireArrayDependency extends Dependency {
	constructor(depsArray, range) {
		super();
		this.depsArray = depsArray;
		this.range = range;
	}

	get type() {
		return "amd require array";
	}
}

AMDRequireArrayDependency.Template = class AMDRequireArrayDependencyTemplate {
	apply(dep, source, runtime) {
		const content = this.getContent(dep, runtime);
		source.replace(dep.range[0], dep.range[1] - 1, content);
	}

	getContent(dep, runtime) {
		const requires = dep.depsArray.map((dependency) => {
			const optionalComment = runtime.outputOptions.pathinfo ? Template.toComment(runtime.requestShortener.shorten(dependency.request)) : "";
			return this.contentForDependency(dependency, optionalComment);
		});
		return `[${requires.join(", ")}]`;
	}

	contentForDependency(dep, comment) {
		if(typeof dep === "string") {
			return dep;
		}

		if(dep.module) {
			const stringifiedId = JSON.stringify(dep.module.id);
			return `__webpack_require__(${comment}${stringifiedId})`;
		} else if(dep.localModule) {
			return dep.localModule.variableName();
		}

		return webpackMissingModuleModule(dep.request);
	}
};

module.exports = AMDRequireArrayDependency;
