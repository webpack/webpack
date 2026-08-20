"use strict";

module.exports = [
	// The three hints about bytes go quiet with `hints: false`; asking for both
	// prefetch and preload stays a configuration mistake either way.
	[
		/conflicting resource hints: these chunks are asked for as both prefetch and preload/
	]
];
