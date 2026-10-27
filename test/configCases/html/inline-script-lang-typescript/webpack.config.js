"use strict";

/**
 * `<script lang="ts">` is a `.ts` file beside its page, so the built-in
 * TypeScript support strips its types with no rule for it.
 * @type {import("../../../../").Configuration}
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
