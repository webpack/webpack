"use strict";

module.exports = [
	// Not gated on `hints`: asking for both directives is a configuration
	// mistake, not a size.
	[
		/conflicting resource hints: these chunks are asked for as both prefetch and preload/
	]
];
