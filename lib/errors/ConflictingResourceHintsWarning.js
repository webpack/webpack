/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * @typedef {object} ConflictingResourceHintDetails
 * @property {string} parent the chunk group the directives were written in
 * @property {string} child the chunk group they point at
 */

class ConflictingResourceHintsWarning extends WebpackError {
	/**
	 * Creates an instance of ConflictingResourceHintsWarning.
	 * @param {ConflictingResourceHintDetails[]} links the conflicting links, parent name first
	 */
	constructor(links) {
		const list = links
			.map((link) => `\n  ${link.parent} -> ${link.child}`)
			.join("");

		super(
			`conflicting resource hints: these chunks are asked for as both prefetch and preload from the same place:${list}\nThe two say opposite things: a preload fetches the chunk at high priority right away, while a prefetch asks for it at idle priority in case it is needed later. Keep 'webpackPreload' for what the page needs now and 'webpackPrefetch' for what it may need later, not both.\nFor more info visit https://webpack.js.org/guides/code-splitting/#prefetchingpreloading-modules`
		);

		/** @type {string} */
		this.name = "ConflictingResourceHintsWarning";
	}
}

module.exports = ConflictingResourceHintsWarning;
