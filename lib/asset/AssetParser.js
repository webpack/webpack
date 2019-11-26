/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Yuta Hiroto @hiroppy
*/

"use strict";

/** @typedef {import("../../declarations/plugins/AssetModulesPluginParser").AssetModulesPluginParserOptions} AssetModulesPluginParserOptions */

class AssetParser {
	/**
	 * @param {AssetModulesPluginParserOptions["dataUrlCondition"] | boolean} dataUrlCondition condition for inlining as DataUrl
	 */
	constructor(dataUrlCondition) {
		this.dataUrlCondition = dataUrlCondition;
	}

	parse(source, state) {
		state.module.buildInfo.strict = true;
		state.module.buildMeta.exportsType = "default";

		if (typeof this.dataUrlCondition === "function") {
			state.module.buildInfo.dataUrl = this.dataUrlCondition(source, {
				filename: state.module.nameForCondition(),
				module: state.module
			});
		} else if (typeof this.dataUrlCondition === "boolean") {
			state.module.buildInfo.dataUrl = this.dataUrlCondition;
		} else if (
			this.dataUrlCondition &&
			typeof this.dataUrlCondition === "object"
		) {
			state.module.buildInfo.dataUrl =
				Buffer.byteLength(source) <= this.dataUrlCondition.maxSize;
		} else {
			throw new Error("Unexpected dataUrlCondition type");
		}

		return state;
	}
}

module.exports = AssetParser;
