"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [false, true].map((minimize) => ({
	mode: "production",
	optimization: { minimize }
}));
