"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function loader() {
	throw new Error("sync wasm boom");
};
