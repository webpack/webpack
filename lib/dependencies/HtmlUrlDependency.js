/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");

class HtmlUrlDependency extends ModuleDependency {
	/**
	 * @param {string} request request
	 * @param {[number, number]} range range
	 */
	constructor(request, range) {
		super(request);
		this.range = range;
	}

	get type() {
		return "html url";
	}

	get category() {
		return "url";
	}
}

HtmlUrlDependency.Template = class HtmlUrlDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * @param {HtmlUrlDependency} dependency the dependency
	 * @param {import("webpack-sources").ReplaceSource} source the source
	 * @param {import("../DependencyTemplate").DependencyTemplateContext} templateContext the context
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const { runtime, codeGenerationResults, moduleGraph } = templateContext;
		const targetModule = moduleGraph.getModule(dependency);
		if (!targetModule) return;

		const codeGen = codeGenerationResults.get(targetModule, runtime);
		if (!codeGen || !codeGen.data) return;

		const url = codeGen.data.get("url");

		if (url && /** @type {Record<string, string>} */ (url)["html-url"]) {
			source.replace(
				dependency.range[0],
				dependency.range[1] - 1,
				/** @type {Record<string, string>} */ (url)["html-url"]
			);
		}
	}
};

makeSerializable(
	HtmlUrlDependency,
	"webpack/lib/dependencies/HtmlUrlDependency"
);

module.exports = HtmlUrlDependency;
