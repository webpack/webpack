/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Yuta Hiroto @hiroppy
*/

"use strict";

class AssetParser {
	parse(source, state) {
		state.module.buildInfo.strict = true;

		return state;
	}
}

module.exports = AssetParser;
