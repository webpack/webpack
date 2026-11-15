"use strict";

// A page naming only part of the run, or the run in another order, would load
// a chunk that runs what it did not list.
module.exports = [
	[
		/The chunk name "pair" asked for by a tag in \.\/reordered\.html is already used by a tag in \.\/owner\.html/
	],
	[
		/The chunk name "pair" asked for by a tag in \.\/subset\.html is already used by a tag in \.\/owner\.html/
	]
];
