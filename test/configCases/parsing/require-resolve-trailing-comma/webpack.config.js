"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [false, true].map((minimize) => ({
	mode: "production",
	optimization: { minimize }
}));
