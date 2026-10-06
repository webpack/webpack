"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function loader(source) {
	const callback = this.async();
	callback(new Error("passed to the async callback"), source);
};
