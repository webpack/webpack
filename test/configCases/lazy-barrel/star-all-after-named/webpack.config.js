"use strict";

const createLazyMakeTest = require("../_helpers/createLazyMakeTest");

module.exports = createLazyMakeTest([], {
	optimization: {
		providedExports: true,
		usedExports: true
	}
});
