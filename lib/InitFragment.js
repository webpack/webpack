/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

/** @typedef {import("webpack-sources").Source} Source */

class InitFragment {
	/**
	 * @param {string|Source} content the source code that will be included as initialization code
	 * @param {number} stage category of initialization code (contribute to order)
	 * @param {number} position position in the category (contribute to order)
	 * @param {string=} key unique key to avoid emitting the same initialization code twice
	 */
	constructor(content, stage, position, key) {
		this.content = content;
		this.stage = stage;
		this.position = position;
		this.key = key;
	}
}

InitFragment.STAGE_CONSTANTS = 10;
InitFragment.STAGE_HARMONY_EXPORTS = 20;
InitFragment.STAGE_HARMONY_IMPORTS = 30;
InitFragment.STAGE_PROVIDES = 40;

module.exports = InitFragment;
