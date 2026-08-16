"use strict";

module.exports = {
	/**
	 * @param {import("../../../").MultiStats} stats stats
	 */
	validate(stats) {
		const json = stats.toJson({ all: false, hints: true, hintsCount: true });
		const hints = json.hints || [];
		if (hints.length !== 2) {
			throw new Error(`expected 2 aggregated hints, got ${hints.length}`);
		}
		if (json.hintsCount !== 2) {
			throw new Error(`expected hintsCount 2, got ${json.hintsCount}`);
		}
		const compilers = hints.map((hint) => hint.compilerPath).sort();
		if (compilers.join(",") !== "first,second") {
			throw new Error(`unexpected compilerPath values: ${compilers.join(",")}`);
		}
	}
};
