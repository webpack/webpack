"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const NullDependency = require("./NullDependency");
const HarmonyImportDependency = require("./HarmonyImportDependency");
class Template {
	apply(dep, source, outputOptions, requestShortener) {
		const content = dep.dependencies.map(
			d => HarmonyImportDependency.makeStatement(false, d, outputOptions, requestShortener)).join("");
		if(dep.hasCallback) {
			source.insert(dep.range[0], `function(__WEBPACK_OUTDATED_DEPENDENCIES__) { ${content}(`);
			source.insert(dep.range[1], ")(__WEBPACK_OUTDATED_DEPENDENCIES__); }");
		} else {
			source.insert(dep.range[1] - 0.5, `, function() { ${content}}`);
		}
	}
}
class HarmonyAcceptDependency extends NullDependency {
	constructor(range, dependencies, hasCallback) {
		super();
		this.range = range;
		this.dependencies = dependencies;
		this.hasCallback = hasCallback;
	}
}
HarmonyAcceptDependency.Template = Template;
HarmonyAcceptDependency.prototype.type = "accepted harmony modules";
module.exports = HarmonyAcceptDependency;
