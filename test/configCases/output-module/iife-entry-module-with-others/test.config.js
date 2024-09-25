module.exports = {
	findBundle: function (i, options) {
		return [
			"module-avoidEntryIife-false.mjs",
			"module-avoidEntryIife-true.mjs",
			"test.js"
		];
	}
};
