"use strict";

// `renderEmbeddedModule.call` is wrapped with `tryRunOrWebpackError`, so a throwing tap
// fails the build with the original message rather than crashing the process,
// and the error passed through `HookWebpackError` on its way — the CSS module's
// `CodeGenerationError` wrapper keeps `message` and `stack` but not `details`,
// so that is as far as the attribution is observable from here.
module.exports = [
	[
		{
			message: /boom/,
			details: /^HookWebpackError: boom/
		}
	]
];
