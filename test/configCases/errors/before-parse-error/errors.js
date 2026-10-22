"use strict";

module.exports = [
	[{ moduleName: /thrown\.js$/ }, /^the tap threw before the parse$/],
	[{ moduleName: /rejected\.js$/ }, /^the tap rejected before the parse$/]
];
