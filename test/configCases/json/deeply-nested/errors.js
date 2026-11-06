"use strict";

// `over-limit.json` must hit the depth check. Engines whose JSON.parse recurses
// (Node.js 10) overflow on `deep.json` before the check runs.
module.exports = [
	[/Module parse failed: JSON nests deeper than 512 levels/],
	[
		/Module parse failed: (JSON nests deeper than 512 levels|Maximum call stack size exceeded)/
	]
];
