/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const InitFragment = require("../InitFragment");
const makeSerializable = require("../util/makeSerializable");
const CachedConstDependency = require("./CachedConstDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../javascript/JavascriptModulesPlugin").ChunkRenderContext} ChunkRenderContext */

class NodeUrlDependency extends CachedConstDependency {}

makeSerializable(
	NodeUrlDependency,
	"webpack/lib/dependencies/NodeUrlDependency"
);

NodeUrlDependency.Template = class NodeUrlDependencyTemplate extends (
	CachedConstDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		super.apply(dependency, source, templateContext);
		const { getData } = templateContext;
		const data = getData();
		/** @type {InitFragment<ChunkRenderContext>[]} */
		let chunkInitFragments = data.get("chunkInitFragments");

		if (!chunkInitFragments) {
			chunkInitFragments = [];
			data.set("chunkInitFragments", chunkInitFragments);
		}

		chunkInitFragments.push(
			new InitFragment(
				'import url from "url";',
				InitFragment.STAGE_CONSTANTS,
				0,
				"import url"
			)
		);
	}
};

module.exports = NodeUrlDependency;
