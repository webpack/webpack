"use strict";

module.exports = [
	[
		// `splitChunks: false` leaves no floor to read, so the fallback decides.
		/tiny chunks: 10 chunks are loaded on demand but carry less than 'optimization\.splitChunks\.minSize'/,
		/\n {2}\d+ \(\d+ bytes\)/
	]
];
