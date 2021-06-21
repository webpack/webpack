/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const { ConcatSource } = require("webpack-sources");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./Generator").GenerateContext} GenerateContext */

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

class InitFragment {
	/**
	 * @param {string|Source} content the source code that will be included as initialization code
	 * @param {number} stage category of initialization code (contribute to order)
	 * @param {number} position position in the category (contribute to order)
	 * @param {string=} key unique key to avoid emitting the same initialization code twice
	 * @param {string|Source=} endContent the source code that will be included at the end of the module
	 */
	constructor(content, stage, position, key, endContent) {
		this.content = content;
		this.stage = stage;
		this.position = position;
		this.key = key;
		this.endContent = endContent;
	}

	/**
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {string|Source} the source code that will be included as initialization code
	 */
	getContent(generateContext) {
		return this.content;
	}

	/**
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {string|Source=} the source code that will be included at the end of the module
	 */
	getEndContent(generateContext) {
		return this.endContent;
	}

	static addToSource(source, initFragments, generateContext) {
		if (initFragments.length > 0) {
			// Sort fragments by position. If 2 fragments have the same position,
			// use their index.
			const sortedFragments = initFragments
				.map(extractFragmentIndex)
				.sort(sortFragmentWithIndex);

			// Deduplicate fragments. If a fragment has no key, it is always included.
			const keyedFragments = new Map();
			for (const [fragment] of sortedFragments) {
				if (typeof fragment.mergeAll === "function") {
					if (!fragment.key) {
						throw new Error(
							`InitFragment with mergeAll function must have a valid key: ${fragment.constructor.name}`
						);
					}
					const oldValue = keyedFragments.get(fragment.key);
					if (oldValue === undefined) {
						keyedFragments.set(fragment.key, fragment);
					} else if (Array.isArray(oldValue)) {
						oldValue.push(fragment);
					} else {
						keyedFragments.set(fragment.key, [oldValue, fragment]);
					}
					continue;
				} else if (typeof fragment.merge === "function") {
					const oldValue = keyedFragments.get(fragment.key);
					if (oldValue !== undefined) {
						keyedFragments.set(fragment.key, fragment.merge(oldValue));
						continue;
					}
				}
				keyedFragments.set(fragment.key || Symbol(), fragment);
			}

			const concatSource = new ConcatSource();
			const endContents = [];
			for (let fragment of keyedFragments.values()) {
				if (Array.isArray(fragment)) {
					fragment = fragment[0].mergeAll(fragment);
				}
				concatSource.add(fragment.getContent(generateContext));
				const endContent = fragment.getEndContent(generateContext);
				if (endContent) {
					endContents.push(endContent);
				}
			}

			concatSource.add(source);
			for (const content of endContents.reverse()) {
				concatSource.add(content);
			}
			return concatSource;
		} else {
			return source;
		}
	}
}

InitFragment.prototype.merge = undefined;

InitFragment.STAGE_CONSTANTS = 10;
InitFragment.STAGE_ASYNC_BOUNDARY = 20;
InitFragment.STAGE_HARMONY_EXPORTS = 30;
InitFragment.STAGE_HARMONY_IMPORTS = 40;
InitFragment.STAGE_PROVIDES = 50;
InitFragment.STAGE_ASYNC_DEPENDENCIES = 60;
InitFragment.STAGE_ASYNC_HARMONY_IMPORTS = 70;

module.exports = InitFragment;
