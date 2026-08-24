"use strict";

module.exports = [
	[
		// Ten async chunks, and the entry chunk is under the floor as well — so
		// this count is also what proves initial chunks are left out.
		/tiny chunks: 10 chunks are loaded on demand but carry less than 'optimization\.splitChunks\.minSize'/,
		/\n {2}\d+ \(\d+ bytes\)/
	]
];
