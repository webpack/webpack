"use strict";

// exported through a variable, so the exports stay statically unknown: that is
// what makes the module wrapped and its default import need interop
const formats = {
	loose: {
		value: "original",
		count: 1,
		flag: false,
		gone: "present",
		deep: { leaf: "leaf" },
		run: () => "ran",
		Ctor: function Ctor() {
			this.tag = "ctor";
		}
	},
	strict: {
		value: "original",
		count: 1,
		flag: false,
		deep: { leaf: "leaf" }
	},
	named: () => "named"
};

module.exports = formats;
