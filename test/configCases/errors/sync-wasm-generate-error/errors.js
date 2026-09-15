"use strict";

module.exports = [
	[
		{ moduleName: /wasm\.wat$/ },
		// the reported error keeps its own stack: only what is emitted is shortened
		/^Module build failed \(from .*loader\.js\):\nError: sync wasm boom\n/
	]
];
