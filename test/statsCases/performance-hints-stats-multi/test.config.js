"use strict";

module.exports = {
	/**
	 * Drives `MultiStats.toJson`, which the printed output above does not reach.
	 * @param {import("../../../").MultiStats} stats the stats
	 * @returns {void}
	 */
	validate(stats) {
		const json = stats.toJson({ all: false, hints: true });
		const hints = json.hints || [];
		if (hints.length !== 2) {
			throw new Error(`expected 2 aggregated hints, got ${hints.length}`);
		}
		const compilers = hints.map((hint) => hint.compilerPath).sort();
		if (compilers.join(",") !== "first,second") {
			throw new Error(`unexpected compilerPath values: ${compilers.join(",")}`);
		}
	}
};
