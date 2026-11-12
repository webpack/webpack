"use strict";

/**
 * @param {string[]} values the run's answer
 * @returns {{ asserted: unknown[] }} the tree the fragment root holds, as the run's own tree with its root left out
 */
const fragmentTree = (values) => {
	const lines = values[0] === "" ? [] : values[0].split("\n");
	if (lines[0] !== "| <html>") return { asserted: [values[0]] };
	return {
		asserted: [
			lines
				.slice(1)
				.map((line) => (line.startsWith("|   ") ? `| ${line.slice(4)}` : line))
				.join("\n")
		]
	};
};

module.exports = {
	fragmentTree
};
