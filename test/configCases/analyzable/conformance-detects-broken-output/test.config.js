"use strict";

module.exports = {
	// Both halves of what a rename leaves behind: the name the entry still writes
	// out, and the chunk that name no longer reaches.
	analyzableConformanceExpected: [
		/bundle0\.mjs names \.\/lazy\.mjs, which was not emitted/,
		/no literal specifier reaches renamed-by-plugin\.mjs/
	]
};
