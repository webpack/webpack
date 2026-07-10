"use strict";

const esmShaped = {
	__esModule: true,
	default: "the default",
	namedExport: 42
};

module.exports = {
	modules: {
		"esm-ext": esmShaped,
		"cjs-ext": esmShaped,
		"plain-ext": esmShaped
	}
};
