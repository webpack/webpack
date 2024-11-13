module.exports = {
	findBundle: function (i, options) {
		return i === 0 ? ["bundle0.mjs"] : [`bundle${i}.js`];
	}
};
