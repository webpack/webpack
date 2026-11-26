"use strict";

/** @import { Stats } from "../../../" */

module.exports = {
	/** @param {Stats} stats compilation stats */
	validate(stats) {
		const { chunks } = stats.toJson({
			all: false,
			chunks: true,
			chunkOrigins: true
		});
		if (!chunks || !chunks[0].origins) throw new Error("Missing chunk origins");
		const { origins } = chunks[0];
		expect(origins).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ loc: "a,b", request: "c" }),
				expect.objectContaining({ loc: "a", request: "b,c" })
			])
		);
		expect(origins.filter(({ loc }) => loc === "a,b")).toHaveLength(1);
	}
};
