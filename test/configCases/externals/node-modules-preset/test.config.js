"use strict";

// Stub the externalized package so the case verifies runtime resolution offline.
module.exports = {
	modules: {
		"fake-dep": { where: "runtime" }
	}
};
