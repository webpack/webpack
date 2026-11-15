"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function changer() {
	return 'module.exports = "changed by loader";';
};
