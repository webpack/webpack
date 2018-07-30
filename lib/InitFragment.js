/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

/** @typedef {import("webpack-sources").Source} Source */

class InitFragment {
	/**
	 * @param {string|Source} content [TODO]
	 * @param {number} stage [TODO]
	 * @param {number} priority [TODO]
	 * @param {string=} key [TODO]
	 */
	constructor(content, stage, priority, key) {
		this.content = content;
		this.stage = stage;
		this.priority = priority;
		this.key = key;
	}
}

InitFragment.STAGE_CONSTANTS = 10;
InitFragment.STAGE_HARMONY_EXPORTS = 20;
InitFragment.STAGE_HARMONY_IMPORTS = 30;
InitFragment.STAGE_PROVIDES = 40;

module.exports = InitFragment;
