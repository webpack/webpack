"use strict";

module.exports = [
	[
		// Exactly five lines: the queue refuses these dozens of times over, each
		// survives once, and the list stops at `MAX_REPORTED_SPLITS`.
		/as it is allowed:\n(?: {2}cacheGroup[^\n]*\n){5}The modules stayed/,
		/'g1' out of p0_js \(2 modules[\s\S]*'g1' out of second [\s\S]*'g2' out of p0_js \(2 modules, maxAsyncRequests is 1\)\nThe modules stayed/
	]
];
