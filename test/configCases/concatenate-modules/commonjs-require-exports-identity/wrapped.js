"use strict";

// reassigned module.exports -> only eligible via wrapping (real exports object)
module.exports = {
	base: "wrapped",
	f() {
		return this.base;
	}
};
