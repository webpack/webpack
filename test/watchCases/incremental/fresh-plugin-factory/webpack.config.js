"use strict";

let applications = 0;

/** @returns {import("../../../..").Configuration[]} watch configurations */
module.exports = () =>
	["development", "production"].map((mode, index) => ({
		mode: /** @type {"development" | "production"} */ (mode),
		devtool: false,
		cache: { type: index === 0 ? "memory" : "filesystem" },
		output: { clean: false, pathinfo: false, filename: `bundle${index}.js` },
		optimization: { minimize: false },
		plugins: [
			() => {
				expect(++applications).toBeLessThanOrEqual(2);
			}
		]
	}));
