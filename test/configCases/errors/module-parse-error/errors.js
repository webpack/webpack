"use strict";

module.exports = [
	// anchored per module: the JSON parse message differs between V8 versions
	[{ moduleName: /broken\.js$/ }, /^Module parse failed: Unexpected token/],
	[{ moduleName: /broken\.json$/ }, /^Module parse failed: /],
	[{ moduleName: /broken\.wasm$/ }, /^Module parse failed: Unsupported type/],
	[
		{ moduleName: /built\.js$/ },
		/^Module build failed \(from .*loader\.js\):\nError: loader boom/
	]
];
