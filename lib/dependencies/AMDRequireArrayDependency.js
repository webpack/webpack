"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const Dependency = require("../Dependency");
const WebpackMissingModule = require("./WebpackMissingModule");
class Template {
	apply(dep, source, outputOptions, requestShortener) {
		const content = `[${dep.depsArray.map(dep => {
			if(typeof dep === "string") {
				return dep;
			} else {
				let comment = "";
				if(outputOptions.pathinfo) {
					comment = "/*! " + requestShortener.shorten(dep.request) + " */ ";
				}
				if(dep.module) {
					return "__webpack_require__(" + comment + JSON.stringify(dep.module.id) + ")";
				} else {
					return WebpackMissingModule.module(dep.request);
				}
			}
		}).join(", ")}]`;
		source.replace(dep.range[0], dep.range[1] - 1, content);
	}
}
class AMDRequireArrayDependency extends Dependency {
	constructor(depsArray, range) {
		super();
		this.depsArray = depsArray;
		this.range = range;
	}
}
AMDRequireArrayDependency.Template = Template;
AMDRequireArrayDependency.prototype.type = "amd require array";
module.exports = AMDRequireArrayDependency;
