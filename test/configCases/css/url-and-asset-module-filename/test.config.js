module.exports = {
	findBundle(i, options) {
		return [`index_css.bundle${i}.js`, `bundle${i}.js`];
	}
};
