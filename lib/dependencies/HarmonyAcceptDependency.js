/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const NullDependency = require("./NullDependency");
const makeHarmonyImportStatement = require("./HarmonyImportDependency").makeImportStatement;

class HarmonyAcceptDependency extends NullDependency {
	constructor(range, dependencies, hasCallback) {
		super();
		this.range = range;
		this.dependencies = dependencies;
		this.hasCallback = hasCallback;
	}

	get type() {
		return "accepted harmony modules";
	}
}

HarmonyAcceptDependency.Template = class HarmonyAcceptDependencyTemplate {
	apply(dep, source, outputOptions, requestShortener) {
		const content = dep.dependencies
			.map(dependency => makeHarmonyImportStatement(
				false,
				dependency,
				outputOptions,
				requestShortener
			)).join("");

		if(dep.hasCallback) {
			source.insert(dep.range[0], `function(__WEBPACK_OUTDATED_DEPENDENCIES__) { ${content}(`);
			source.insert(dep.range[1], ")(__WEBPACK_OUTDATED_DEPENDENCIES__); }");
			return;
		}

		source.insert(dep.range[1] - 0.5, `, function() { ${content} }`);
	}
};

module.exports = HarmonyAcceptDependency;
