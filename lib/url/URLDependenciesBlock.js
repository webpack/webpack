/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const AsyncDependenciesBlock = require("../graph/AsyncDependenciesBlock");
const makeSerializable = require("../util/makeSerializable");

/** @import { GroupOptions } from "../graph/AsyncDependenciesBlock" */
/** @import { DependencyLocation } from "../graph/Dependency" */
/** @import { EntryOptions } from "../graph/Entrypoint" */
/**
 * Per-compilation URL entry identity applied by {@link URLDependenciesBlock#promote}.
 * @typedef {object} BlockPromotion
 * @property {EntryOptions} entryOptions
 * @property {string=} chunkFilenameGlobal
 */

/**
 * Async block for `new URL()`. Without a promotion it stays in the parent
 * chunk; `promote` elevates it to an async entry for one compilation.
 */
class URLDependenciesBlock extends AsyncDependenciesBlock {
	/**
	 * @param {GroupOptions | string | null} groupOptions options for the group
	 * @param {(DependencyLocation | null)=} loc the line of code
	 * @param {(string | null)=} request the request
	 */
	constructor(groupOptions, loc, request) {
		if (typeof groupOptions === "string") {
			groupOptions = { name: groupOptions, circular: false };
		} else if (!groupOptions) {
			groupOptions = { name: undefined, circular: false };
		} else {
			groupOptions = { ...groupOptions, circular: false };
		}
		super(groupOptions, loc, request);
		/** @type {BlockPromotion | undefined} */
		this.promotion = undefined;
	}

	/**
	 * Marks this URL block as an async entry for the current compilation only.
	 * @param {BlockPromotion} promotion entry options and optional filename helper
	 * @returns {void}
	 */
	promote(promotion) {
		this.promotion = promotion;
	}

	/**
	 * Clears per-compilation entry identity so the block stays in the parent chunk.
	 * @returns {void}
	 */
	demote() {
		this.promotion = undefined;
	}
}

makeSerializable(URLDependenciesBlock, "webpack/lib/url/URLDependenciesBlock");

module.exports = URLDependenciesBlock;
