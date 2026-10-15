"use strict";

const warnings = [
	[/export 'b' \(reexported as 'r0'\) was not found in '\.\/target'/]
];

module.exports = [...warnings, ...warnings];
