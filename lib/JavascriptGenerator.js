/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource, RawSource, ReplaceSource } = require("webpack-sources");
const Generator = require("./Generator");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./DependenciesBlock")} DependenciesBlock */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./Generator").GenerateContext} GenerateContext */
/** @typedef {import("./InitFragment")} InitFragment */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./NormalModule")} NormalModule */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */

// TODO: clean up this file
// replace with newer constructs

/**
 * @param {InitFragment} fragment the init fragment
 * @param {number} index index
 * @returns {[InitFragment, number]} tuple with both
 */
const extractFragmentIndex = (fragment, index) => [fragment, index];

/**
 * @param {[InitFragment, number]} a first pair
 * @param {[InitFragment, number]} b second pair
 * @returns {number} sort value
 */
const sortFragmentWithIndex = ([a, i], [b, j]) => {
	const stageCmp = a.stage - b.stage;
	if (stageCmp !== 0) return stageCmp;
	const positionCmp = a.position - b.position;
	if (positionCmp !== 0) return positionCmp;
	return i - j;
};

class JavascriptGenerator extends Generator {
	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source} generated code
	 */
	generate(module, { dependencyTemplates, runtimeTemplate }) {
		const originalSource = module.originalSource();
		if (!originalSource) {
			return new RawSource("throw new Error('No source available');");
		}

		const source = new ReplaceSource(originalSource);
		// TODO: remove this hack
		const sourceAsAny = /** @type {any} */ (source);
		sourceAsAny.module = module;
		const initFragments = [];

		this.sourceBlock(
			module,
			module,
			dependencyTemplates,
			initFragments,
			source,
			runtimeTemplate
		);

		if (initFragments.length > 0) {
			// Sort fragments by position. If 2 fragments have the same position,
			// use their index.
			const sortedFragments = initFragments
				.map(extractFragmentIndex)
				.sort(sortFragmentWithIndex);

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
	 * @param {DependenciesBlock} block the dependencies block which will be processed
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @param {InitFragment[]} initFragments mutable list of init fragments
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @returns {void}
	 */
	sourceBlock(
		module,
		block,
		dependencyTemplates,
		initFragments,
		source,
		runtimeTemplate
	) {
		for (const dependency of block.dependencies) {
			this.sourceDependency(
				module,
				dependency,
				dependencyTemplates,
				initFragments,
				source,
				runtimeTemplate
			);
		}

		for (const childBlock of block.blocks) {
			this.sourceBlock(
				module,
				childBlock,
				dependencyTemplates,
				initFragments,
				source,
				runtimeTemplate
			);
		}
	}

	/**
	 * @param {Module} module the current module
	 * @param {TODO} dependency the dependency to generate
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @param {InitFragment[]} initFragments mutable list of init fragments
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @returns {void}
	 */
	sourceDependency(
		module,
		dependency,
		dependencyTemplates,
		initFragments,
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

		const fragments = template.getInitFragments(dependency, {
			runtimeTemplate,
			dependencyTemplates,
			module
		});

		if (fragments) {
			for (const fragment of fragments) {
				initFragments.push(fragment);
			}
		}
	}
}

module.exports = JavascriptGenerator;
