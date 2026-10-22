"use strict";

const ENTRIES = [
	"forms",
	"alias-default",
	"reexport-default",
	"named-as-default",
	"anonymous-function",
	"anonymous-class",
	"expression"
];

module.exports = {
	findBundle(i) {
		const suffix = i === 0 ? "" : "-no-concat";
		return ENTRIES.map((name) => `./${name}${suffix}.mjs`);
	}
};
