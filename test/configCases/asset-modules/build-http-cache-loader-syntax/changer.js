"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function changer() {
	return 'export default "changed by loader";';
};
