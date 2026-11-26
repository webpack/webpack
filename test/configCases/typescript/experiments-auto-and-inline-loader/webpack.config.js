"use strict";

/** @import { Configuration } from "../../../../" */

// `experiments.typescript` stays at its "auto" default (no `.ts` rule in
// `module.rules`), so the built-in support auto-enables. A loader applied via
// an inline request — the html-webpack-plugin-style path that `module.rules`
// can't see — must still get its output stripped, not misparsed.

/** @type {Configuration} */
module.exports = {
	entry: "./index.ts"
};
