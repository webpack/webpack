"use strict";

module.exports = [
	[/duplicate modules: copies of the same module across chunks add/],
	[/unsplit vendors: initial chunks carry node_modules code/],
	[/split chunks capped: 'optimization\.splitChunks' refused these splits/],
	[
		/conflicting resource hints: these chunks are asked for as both prefetch and preload/
	]
];
