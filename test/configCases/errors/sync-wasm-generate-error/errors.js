"use strict";

module.exports = [
	[
		{ moduleName: /wasm\.wat$/ },
		// the `from` is shortened, while the stack the reported error carries is
		// its own: only what webpack emits is written relative
		/^Module build failed \(from \.\/loader\.js\):\nError: sync wasm boom\n/
	]
];
