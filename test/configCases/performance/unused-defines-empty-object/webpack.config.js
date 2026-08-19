"use strict";

const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning",
		unusedDefines: true
	},
	plugins: [
		new DefinePlugin({
			// An object with no members substitutes as `({})`, so it is a define like
			// any other and reports on its own key rather than on a member.
			READ_FLAGS: {},
			UNREAD_FLAGS: {},
			OUTER: { INNER: {} }
		})
	]
};
