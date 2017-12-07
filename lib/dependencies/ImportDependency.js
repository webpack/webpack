/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ModuleDependency = require("./ModuleDependency");
const Template = require("../Template");
const DepBlockHelpers = require("./DepBlockHelpers");
const webpackMissingPromiseModule = require("./WebpackMissingModule").promise;

class ImportDependency extends ModuleDependency {
	constructor(request, originModule, block) {
		super(request);
		this.originModule = originModule;
		this.block = block;
	}

	get type() {
		return "import()";
	}
}

ImportDependency.Template = class ImportDependencyTemplate {
	apply(dep, source, runtime) {
		const depBlock = dep.block;
		const promise = DepBlockHelpers.getDepBlockPromise(depBlock, runtime, "import()");
		const comment = runtime.outputOptions.pathinfo ? Template.toComment(runtime.requestShortener.shorten(dep.request)) : "";

		const content = this.getContent(promise, dep, comment);
		source.replace(depBlock.range[0], depBlock.range[1] - 1, content);
	}

	getContent(promise, dep, comment) {
		let getModuleFunction;

		if(dep.module) {
			const stringifiedId = JSON.stringify(dep.module.id);
			if(dep.module.meta && dep.module.meta.harmonyModule) {
				getModuleFunction = `__webpack_require__.bind(null, ${comment}${stringifiedId})`;
			} else if(dep.originModule.meta.strictHarmonyModule) {
				getModuleFunction = `function() { return /* fake namespace object */ { "default": __webpack_require__(${comment}${stringifiedId}) }; }`;
			} else {
				getModuleFunction = `function() { var module = __webpack_require__(${comment}${stringifiedId}); return typeof module === "object" && module && module.__esModule ? module : /* fake namespace object */ { "default": module }; }`;
			}

			return `${promise || "Promise.resolve()"}.then(${getModuleFunction})`;
		}

		return webpackMissingPromiseModule(dep.request);
	}
};

module.exports = ImportDependency;
