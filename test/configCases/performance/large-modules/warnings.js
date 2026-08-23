"use strict";

module.exports = [
	[
		/large modules: 1 module carries most of the chunk it is in/,
		// The share and both sizes are platform-dependent, so only the shape is
		// pinned — what matters is that `fat` is the module named.
		/\n {2}\.\/fat\.js is \d+% of 'main' \(\d+(\.\d+)? \w+ of \d+(\.\d+)? \w+\)/
	]
];
