"use strict";

// Which module a path starts at follows the traversal order, so every valid
// rotation is listed rather than pinning one.
const FOUR_MODULE_GROUP =
	"(?:\\./a\\.js -> \\./b\\.js -> \\./a\\.js|\\./b\\.js -> \\./a\\.js -> \\./b\\.js|\\./c\\.js -> \\./d\\.js -> \\./a\\.js -> \\./c\\.js|\\./d\\.js -> \\./a\\.js -> \\./c\\.js -> \\./d\\.js)";
const TWO_MODULE_GROUP =
	"(?:\\./e\\.js -> \\./f\\.js -> \\./e\\.js|\\./f\\.js -> \\./e\\.js -> \\./f\\.js)";

module.exports = [
	[
		/circular dependencies: 2 groups of modules import each other synchronously, shortest cycle of each shown/,
		// The four-module group is reported first, and its size is not the length
		// of the shortest cycle printed for it.
		new RegExp(
			`\\n {2}4 modules: ${FOUR_MODULE_GROUP}\\n {2}2 modules: ${TWO_MODULE_GROUP}\\n`
		)
	]
];
