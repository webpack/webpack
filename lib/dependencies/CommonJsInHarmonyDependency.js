/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const NullDependency = require("./NullDependency");
const CommonJsInHarmonyWarning = require("./CommonJsInHarmonyWarning");

class CommonJsInHarmonyDependency extends NullDependency {
	constructor(originModule, name) {
		super();
		this.name = name;
		this.originModule = originModule;
	}

	get type() {
		return "cjs in harmony";
	}

	get requireWebpackRequire() {
		return false;
	}

	getErrors() {
		if(this.originModule && this.originModule.meta && this.originModule.meta.harmonyModule) {
			return [
				new CommonJsInHarmonyWarning(this.name, this.loc)
			];
		}
	}
}

CommonJsInHarmonyDependency.Template = NullDependency.Template;

module.exports = CommonJsInHarmonyDependency;
