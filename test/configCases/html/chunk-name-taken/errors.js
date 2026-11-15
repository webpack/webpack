"use strict";

module.exports = [
	[
		/The chunk name "main" asked for by a tag in \.\/page\.html is already used by entry "main"/
	],
	// The pages are claimed in identifier order, so `other.html` holds the name.
	[
		/The chunk name "shared" asked for by a tag in \.\/page\.html is already used by a tag in \.\/other\.html/
	]
];
