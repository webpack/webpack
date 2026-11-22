"use strict";

module.exports = {
	findBundle(index) {
		const mode = [
			"unset",
			"allowed",
			"denied",
			"dangling",
			"no-compare",
			"parent-segment",
			"backslash-name"
		][index];
		return `./${mode}/dist/bundle${index}.js`;
	}
};
