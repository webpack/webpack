"use strict";

const createLazyBarrelTest = require("../_helpers/createLazyBarrelTest");

module.exports = createLazyBarrelTest([], {
	optimization: {
		providedExports: true,
		usedExports: true
	}
});
