"use strict";

const fs = require("fs");

module.exports = {
	/**
	 * @param {import("../../../../").Configuration} options options
	 */
	afterExecute(options) {
		const outputPath = /** @type {string} */ (
			/** @type {NonNullable<typeof options.output>} */ (options.output).path
		);
		const emitted = fs
			.readdirSync(outputPath)
			.filter((file) => /\.js$/.test(file));
		if (emitted.length > 0) {
			throw new Error(`Emitted ${emitted.join(", ")} despite errors`);
		}
	}
};
