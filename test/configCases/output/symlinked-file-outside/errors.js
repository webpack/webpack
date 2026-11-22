"use strict";

module.exports = ["denied", "dangling", "no-compare", "parent-segment"].map(
	(mode) => [
		new RegExp(
			`Asset "linked\\.txt" is not emitted because it would be written outside of output\\.path .*[\\\\/]${mode}[\\\\/]dist\\)`
		)
	]
);
