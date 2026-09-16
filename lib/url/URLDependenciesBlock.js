/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const makeSerializable = require("../util/makeSerializable");

/** @import { GroupOptions } from "../AsyncDependenciesBlock" */
/** @import { DependencyLocation } from "../Dependency" */
/** @import { EntryOptions } from "../Entrypoint" */

/**
 * Per-compilation URL entry promotion (not serialized).
 * @typedef {object} BlockPromotion
 * @property {EntryOptions} entryOptions
 * @property {string=} chunkFilenameGlobal
 */

/**
 * Async block for `new URL()`. Without `promotion` it stays in the parent
 * chunk; with `promotion` it becomes an async entry (e.g. CSS `exportType: "url"`).
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
}

makeSerializable(URLDependenciesBlock, "webpack/lib/url/URLDependenciesBlock");

module.exports = URLDependenciesBlock;
