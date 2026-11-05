"use strict";

// Engines whose JSON.parse recurses (Node.js 10) overflow before the depth check.
module.exports = [
	[
		/Module parse failed: (JSON nests deeper than 512 levels|Maximum call stack size exceeded)/
	]
];
