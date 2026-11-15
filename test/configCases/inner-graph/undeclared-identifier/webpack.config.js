"use strict";

module.exports = {
	mode: "production",
	optimization: {
		// terser drops the same initializer (its own bug) and would mask the fix
		minimize: false
	}
};
