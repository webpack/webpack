"use strict";

module.exports = {
	findBundle(index) {
		const mode = [
			"unset",
			"allowed",
			"denied",
			"allowed-link",
			"future-defaults",
			"emitted-link",
			"nested-link"
		][index];
		return mode === "future-defaults"
			? `./${mode}/dist/main.mjs`
			: `./${mode}/dist/bundle${index}.js`;
	}
};
