module.exports = {
	findBundle: function (i, options) {
		return [
			`style_module_css_as-is.bundle${i}.js`,
			`style_module_css_camel-case.bundle${i}.js`,
			`style_module_css_camel-case-only.bundle${i}.js`,
			`style_module_css_dashes.bundle${i}.js`,
			`style_module_css_dashes-only.bundle${i}.js`,
			`style_module_css_upper.bundle${i}.js`,
			`bundle${i}.js`
		];
	}
};
