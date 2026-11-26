"use strict";

/** @import { Stats } from "../../../" */

module.exports = {
	/**
	 * @param {Stats} stats stats
	 */
	validate(stats) {
		expect(stats.compilation.modules.size).toBe(247);
	}
};
