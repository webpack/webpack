"use strict";

// exported through a variable, so the exports stay statically unknown and every
// reader below reaches the module through its wrapper accessor
const store = {
	nested: {
		value: "original",
		count: 1,
		flag: false,
		gone: "present",
		deep: { leaf: "leaf" }
	}
};

module.exports = store;
