/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

/** @typedef {import("webpack-sources").Source} Source */

class InitFragment {
	/**
	 * @param {string|Source} content [TODO]
	 * @param {number} priority [TODO]
	 * @param {string=} key [TODO]
	 */
	constructor(content, priority, key) {
		this.content = content;
		this.priority = priority;
		this.key = key;
	}
}

module.exports = InitFragment;
