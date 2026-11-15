"use strict";

/** @import { Configuration } from "webpack" */

/** @type {Configuration["cache"][]} */
const caches = [false, true, { type: "filesystem" }];

/** @type {Configuration[]} */
module.exports = caches.map((cache) => ({
	mode: "development",
	cache,
	module: { unsafeCache: false }
}));
