/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const HarmonyImportDependency = require("./HarmonyImportDependency");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("./HarmonyAcceptImportDependency")} HarmonyAcceptImportDependency */

class HarmonyAcceptDependency extends NullDependency {
	/**
	 * @param {[number, number]} range expression range
	 * @param {HarmonyAcceptImportDependency[]} dependencies import dependencies
	 * @param {boolean} hasCallback true, if the range wraps an existing callback
	 */
	constructor(range, dependencies, hasCallback) {
		super();
		this.range = range;
		this.dependencies = dependencies;
		this.hasCallback = hasCallback;
	}

	get type() {
		return "accepted harmony modules";
	}

	serialize(context) {
		const { write } = context;
		write(this.range);
		write(this.dependencies);
		write(this.hasCallback);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.range = read();
		this.dependencies = read();
		this.hasCallback = read();
		super.deserialize(context);
	}
}

makeSerializable(
	HarmonyAcceptDependency,
	"webpack/lib/dependencies/HarmonyAcceptDependency"
);

HarmonyAcceptDependency.Template = class HarmonyAcceptDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {HarmonyAcceptDependency} */ (dependency);
		const { module, runtimeTemplate } = templateContext;
		const content = dep.dependencies
			.filter(dependency =>
				HarmonyImportDependency.Template.isImportEmitted(dependency, module)
			)
			.map(dependency => {
				const s = dependency.getImportStatement(true, templateContext);
				return s[0] + s[1];
			})
			.join("");

		if (dep.hasCallback) {
			if (runtimeTemplate.supportsArrowFunction()) {
				source.insert(
					dep.range[0],
					`__WEBPACK_OUTDATED_DEPENDENCIES__ => { ${content}(`
				);
				source.insert(dep.range[1], ")(__WEBPACK_OUTDATED_DEPENDENCIES__); }");
			} else {
				source.insert(
					dep.range[0],
					`function(__WEBPACK_OUTDATED_DEPENDENCIES__) { ${content}(`
				);
				source.insert(
					dep.range[1],
					")(__WEBPACK_OUTDATED_DEPENDENCIES__); }.bind(this)"
				);
			}
			return;
		}

		const arrow = runtimeTemplate.supportsArrowFunction();
		source.insert(
			dep.range[1] - 0.5,
			`, ${arrow ? "() =>" : "function()"} { ${content} }`
		);
	}
};

module.exports = HarmonyAcceptDependency;
