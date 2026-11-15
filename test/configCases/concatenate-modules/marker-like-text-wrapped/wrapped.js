"use strict";

// The reassigned module.exports keeps this body wrapped in the concatenation.
module.exports = {
	data: require("./data.json"),
	text: require("./text.txt"),
	string: "__WEBPACK_MODULE_REFERENCE__0_ns__._",
	template: `__WEBPACK_MODULE_REFERENCE__1_ns__._`,
	regexp: /__WEBPACK_MODULE_REFERENCE__2_ns__/.source,
	/* __WEBPACK_MODULE_REFERENCE__0_ns__*/ comment: true,
	plugin: TEST_MODULE_REFERENCE,
	target: require("./target").value
};
