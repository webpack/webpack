module.exports = [
	// each time sets different assetsInfo object instance in webpack.config.js:54
	// this prevents hit in inmemory cache
	/^Pack got invalid because of write to: TerserWebpackPlugin|bundle0\.js$/
];
