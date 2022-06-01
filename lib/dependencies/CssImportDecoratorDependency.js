/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const Template = require("../Template");
const makeSerializable = require("../util/makeSerializable");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../ModuleGraphConnection")} ModuleGraphConnection */
/** @typedef {import("../ModuleGraphConnection").ConnectionState} ConnectionState */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

class CssImportDecoratorDependency extends NullDependency {
	/**
	 * @param {string[][]} decorations The decorations to wrap the source
	 */
	constructor(decorations) {
		super();
		this.decorations = decorations;
	}

	get type() {
		return "css @import decorator";
	}
}

/**
 * @param {string | undefined} layer The layer query to parse
 * @param {string | undefined} supports The supports query to parse
 * @param {string | undefined} media The media query to parse
 * @returns {string[][]} The decorations to wrap the source
 */
const getDecorator = (layer, supports, media) => {
	const decorations = [];

	if (layer) {
		decorations.push([`@layer ${layer} {`, `}`]);
	}

	if (supports) {
		decorations.push([`@supports(${supports}) {`, `}`]);
	}

	if (media) {
		decorations.push([`@media ${media} {`, `}`]);
	}

	return decorations;
};

CssImportDecoratorDependency.Template = class CssImportDecoratorDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {CssImportDecoratorDependency} */ (dependency);
		const { decorations } = dep;
		const replacedSource = `${source.source()}`;

		// We use the replaced source and reset the replacements as a patch for to replace all the code
		// @ts-expect-error
		source._replacements = [];

		source.replace(
			0,
			source.size(),
			`
${decorations
	.map(([before, after], idx) => {
		return Array(idx)
			.fill()
			.reduce(tpl => Template.indent(tpl), before);
	})
	.join("\n")}
${Array(decorations.length)
	.fill()
	.reduce(tpl => Template.indent(tpl), replacedSource)}
${decorations
	.map(([before, after], idx) => {
		return Array(decorations.length - 1 - idx)
			.fill()
			.reduce(tpl => Template.indent(tpl), after);
	})
	.join("\n")}`
		);
	}
};

makeSerializable(
	CssImportDecoratorDependency,
	"webpack/lib/dependencies/CssImportDecoratorDependency"
);

module.exports = CssImportDecoratorDependency;
module.exports.getDecorator = getDecorator;
