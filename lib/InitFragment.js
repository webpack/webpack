/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

/** @typedef {import("webpack-sources").Source} Source */

class InitFragment {
	/**
	 * @param {string|Source} content [TODO]
	 * @param {number} order [TODO]
	 * @param {string=} key [TODO]
	 */
	constructor(content, order, key) {
		this.content = content;
		this.order = order;
		this.key = key;
	}
}

module.exports = InitFragment;
