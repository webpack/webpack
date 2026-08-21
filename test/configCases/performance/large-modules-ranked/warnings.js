"use strict";

module.exports = [
	[
		/large modules: 3 modules carry most of the chunk they are in/,
		// All three weigh the same, so the order is the name tie-break alone. The
		// shared one is in two chunks and is named for the first of them, which
		// has no name of its own and so is named by its id.
		/\n {2}\.\/fat-one\.js is \d+% of 'one' \([^)]+\)\n {2}\.\/fat-shared\.js is \d+% of 'holds-a_js' \([^)]+\)\n {2}\.\/fat-two\.js is \d+% of 'two' \([^)]+\)/
	]
];
