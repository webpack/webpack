"use strict";

module.exports = [
	[
		/unused modules: 1 module is bundled although nothing uses what they export, costing \d+ bytes/,
		// The statement is named, which is the point of the hint.
		/\n {2}\.\/tracker\.js \(\d+ bytes\) — ExpressionStatement at \d+:\d+-\d+/
	]
];
