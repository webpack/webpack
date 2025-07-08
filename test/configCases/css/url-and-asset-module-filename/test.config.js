module.exports = {
	findBundle(i) {
		return [`index_css.bundle${i}.js`, `bundle${i}.js`];
	}
};
