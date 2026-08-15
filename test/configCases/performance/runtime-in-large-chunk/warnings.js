"use strict";

module.exports = [
	[/entrypoint size limit/],
	[
		/The runtime is part of the initial chunk of main\./,
		/Set 'optimization\.runtimeChunk' to emit the runtime as its own chunk\./
	]
];
