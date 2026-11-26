"use strict";

/** @import { Configuration } from "../../../../" */

/**
 * `<script lang="ts">` is a `data:text/typescript` module, so the built-in
 * TypeScript support strips its types with no rule for it.
 * @type {Configuration}
 */
module.exports = {
	devtool: false,
	entry: {
		main: ["./index.js", "./page.html"]
	},
	output: {
		filename: "[name].js"
	},
	experiments: {
		html: true
	}
};
