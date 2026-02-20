/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Nihal Shinde @NihalShinde4933
*/

"use strict";

it("should allow interceptors to rescue missing modules (Next.js/HMR flow)", function() {
	// Without your fix, this require() fails immediately with MODULE_NOT_FOUND
	// With your fix, the "TestPlugin" in webpack.config.js intercepts it first
	const result = require("./missing-file");
	
	expect(result).toBe("recovered-success");
});