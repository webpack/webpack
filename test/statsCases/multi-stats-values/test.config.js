"use strict";

/** @typedef {import("../../../").StatsOptions} StatsOptions */

const counts = /** @type {StatsOptions} */ ({
	all: false,
	version: false,
	errorsCount: true,
	warningsCount: true
});
const unnamed = { name: undefined };
const counted = { errorsCount: 0, name: undefined, warningsCount: 1 };
const totals = { errorsCount: 0, warningsCount: 2 };

module.exports = {
	/**
	 * @param {import("../../../").MultiStats} stats stats
	 */
	validate(stats) {
		const json = stats.toJson();
		expect(json.children).toHaveLength(2);
		expect(json.children).toEqual([
			expect.objectContaining({ hash: expect.any(String) }),
			expect.objectContaining({ hash: expect.any(String) })
		]);

		for (const value of /** @type {StatsOptions[]} */ ([
			false,
			"none",
			{ children: [false, false] },
			{ children: ["none", "none"] }
		])) {
			expect(stats.toJson(value)).toStrictEqual({
				children: [unnamed, unnamed]
			});
			expect(stats.toString(value)).toBe("");
		}

		expect(stats.toJson(counts)).toStrictEqual({
			children: [counted, counted],
			...totals
		});
		expect(stats.toString(counts)).toBe(
			"webpack compiled with 1 warning\n\nwebpack compiled with 1 warning"
		);

		const perChild = { children: [{ ...counts, publicPath: true }, counts] };
		expect(stats.toJson(perChild)).toStrictEqual({
			children: [{ ...counted, publicPath: "auto" }, counted],
			...totals
		});
		expect(stats.toString(perChild)).toBe(
			"PublicPath: auto\nwebpack compiled with 1 warning\n\nwebpack compiled with 1 warning"
		);

		const mixed = { children: [false, counts] };
		expect(stats.toJson(mixed)).toStrictEqual({
			children: [unnamed, counted]
		});
		expect(stats.toString(mixed)).toBe("webpack compiled with 1 warning");
	}
};
