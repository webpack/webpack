"use strict";

module.exports = [
	[
		/large modules: 3 modules carry most of the chunk they are in/,
		// All three weigh the same, so only the name orders them; the shared one
		// is named for the first of its two chunks, which has only an id.
		/\n {2}\.\/fat-one\.js is \d+% of 'one' \([^)]+\)\n {2}\.\/fat-shared\.js is \d+% of 'holds-a_js' \([^)]+\)\n {2}\.\/fat-two\.js is \d+% of 'two' \([^)]+\)/
	]
];
