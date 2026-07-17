"use strict";

// Regression test: a `<base href>` inside an inert `<template>` must NOT set the
// document base. If it did, `<img src="./icon.png">` would resolve against
// `./missing-dir/` (a module that does not exist → build error), and a real
// `<base>` later in the document would also be suppressed.
/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "[name][ext]"
	},
	experiments: {
		html: true
	}
};
