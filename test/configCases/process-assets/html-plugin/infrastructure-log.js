module.exports = [
	// each time returns different OriginalSource in webpack.config.js:78
	// this prevents hit in inmemory cache
	/^Pack got invalid because of write to: RealContentHashPlugin|analyse|index\.html$/
];
