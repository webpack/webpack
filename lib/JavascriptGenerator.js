/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource, RawSource, ReplaceSource } = require("webpack-sources");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./DependenciesBlock")} DependenciesBlock */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./InitFragment")} InitFragment */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */

// TODO: clean up this file
// replace with newer constructs

/**
 * @param {InitFragment} fragment [TODO]
 * @param {number} index [TODO]
 * @returns {[InitFragment, number]} [TODO]
 */
const extractFragmentIndex = (fragment, index) => [fragment, index];

/**
 * @param {[InitFragment, number]} a first pair
 * @param {[InitFragment, number]} b second pair
 * @returns {number} sort value
 */
const sortByFragmentIndex = ([a, i], [b, j]) => {
	const x = a.priority - b.priority;
	return x !== 0 ? x : i - j;
};

class JavascriptGenerator {
	/**
	 * @param {Module} module the entry module
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @returns {Source} the generated source
	 */
	generate(module, dependencyTemplates, runtimeTemplate) {
		const originalSource = module.originalSource();
		if (!originalSource) {
			return new RawSource("throw new Error('No source available');");
		}

		const source = new ReplaceSource(originalSource);
		const dependencyFragments = [];

		this.sourceBlock(
			module,
			module,
			dependencyTemplates,
			dependencyFragments,
			source,
			runtimeTemplate
		);

		if (dependencyFragments.length > 0) {
			// Sort fragments by priority. If 2 fragments have the same priority,
			// use their index.
			const sortedFragments = dependencyFragments
				.map(extractFragmentIndex)
				.sort(sortByFragmentIndex);

			// Deduplicate fragments. If a fragment has no key, it is always included.
			const keyedFragments = new Map();
			for (const [fragment] of sortedFragments) {
				keyedFragments.set(fragment.key || Symbol(), fragment);
			}

			const concatSource = new ConcatSource();
			for (const fragment of keyedFragments.values()) {
				concatSource.add(fragment.content);
			}

			concatSource.add(source);
			return concatSource;
		} else {
			return source;
		}
	}

	/**
	 * @param {Module} module the module to generate
	 * @param {DependenciesBlock} block [TODO]
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @param {InitFragment[]} dependencyFragments [TODO]
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @returns {void}
	 */
	sourceBlock(
		module,
		block,
		dependencyTemplates,
		dependencyFragments,
		source,
		runtimeTemplate
	) {
		for (const dependency of block.dependencies) {
			this.sourceDependency(
				dependency,
				dependencyTemplates,
				dependencyFragments,
				source,
				runtimeTemplate
			);
		}

		for (const childBlock of block.blocks) {
			this.sourceBlock(
				module,
				childBlock,
				dependencyTemplates,
				dependencyFragments,
				source,
				runtimeTemplate
			);
		}
	}

	/**
	 * @param {TODO} dependency the dependency to generate
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @param {InitFragment[]} dependencyFragments [TODO]
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @returns {void}
	 */
	sourceDependency(
		dependency,
		dependencyTemplates,
		dependencyFragments,
		source,
		runtimeTemplate
	) {
		const template = dependencyTemplates.get(dependency.constructor);
		if (!template) {
			throw new Error(
				"No template for dependency: " + dependency.constructor.name
			);
		}

		template.apply(dependency, source, runtimeTemplate, dependencyTemplates);

		const fragments = template.getInitFragments(
			dependency,
			source, // TODO remove this argument
			runtimeTemplate,
			dependencyTemplates
		);

		if (fragments) {
			for (const fragment of fragments) {
				dependencyFragments.push(fragment);
			}
		}
	}
}

module.exports = JavascriptGenerator;
