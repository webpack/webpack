"use strict";

module.exports = [
	// each time returns different OriginalSource in webpack.config.js:33
	// this prevents hit in inmemory cache
	/^Pack got invalid because of write to: RealContentHashPlugin|analyse|third.party.js$/
];
