"use strict";

module.exports = [
	[
		/unsplit vendors: initial chunks carry node_modules code/,
		// Nothing named this chunk, so the report falls back to its id.
		/shared-node_modules_vendor-lib_index_js-shared_js \(1 modules from node_modules/
	]
];
