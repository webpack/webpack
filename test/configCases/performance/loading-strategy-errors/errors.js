"use strict";

module.exports = [
	[/entrypoint overlap: modules shipped by more than one entrypoint/],
	[/unsplit vendors: initial chunks carry node_modules code/],
	[/split chunks capped: 'optimization\.splitChunks' refused these splits/],
	[
		/conflicting resource hints: these chunks are asked for as both prefetch and preload/
	]
];
