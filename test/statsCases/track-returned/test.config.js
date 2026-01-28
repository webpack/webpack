"use strict";

module.exports = {
	/**
	 * @param {import("../../../").Stats} stats stats
	 */
	validate(stats) {
		expect(stats.compilation.modules.size).toBe(246);
	}
};
