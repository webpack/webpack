module.exports = {
	findBundle: function (i, options) {
		return [`index_css.bundle${i}.js`, `bundle${i}.js`];
	}
};
