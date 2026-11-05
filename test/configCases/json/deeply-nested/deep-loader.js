"use strict";

const DEPTH = 10000;

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function deepLoader() {
	return `${'{"a":'.repeat(DEPTH)}1${"}".repeat(DEPTH)}`;
};
