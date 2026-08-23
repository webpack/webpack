"use strict";

// A final loader must hand back a Buffer or a string; anything else is reported
// without a `from` prefix, since the error is webpack's rather than the loader's.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function loader() {
	return /** @type {any} */ (42);
};
