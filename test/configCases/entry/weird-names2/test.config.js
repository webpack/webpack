module.exports = {
	findBundle(i, options) {
		return [
			`../weird-names2-out/entry/entry-${options.target}.js`,
			`../weird-names2-out/entry-${options.target}.js`
		];
	}
};
