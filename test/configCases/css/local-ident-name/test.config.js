module.exports = {
	findBundle: function (i, options) {
		return [
			`style_module_css.bundle${i}.js`,
			`style_module_css_hash.bundle${i}.js`,
			`style_module_css_hash-local.bundle${i}.js`,
			`style_module_css_path-name-local.bundle${i}.js`,
			`style_module_css_file-local.bundle${i}.js`,
			`style_module_css_q_f.bundle${i}.js`,
			`style_module_css_uniqueName-id-contenthash.bundle${i}.js`,
			`style_module_less.bundle${i}.js`,
			`bundle${i}.js`
		];
	}
};
