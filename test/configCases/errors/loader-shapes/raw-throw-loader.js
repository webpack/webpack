"use strict";

/** @type {import("../../../../").RawLoaderDefinition} */
module.exports = function loader() {
	throw new Error("thrown from a raw loader");
};

module.exports.raw = true;
