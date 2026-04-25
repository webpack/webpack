"use strict";

const findOutputFiles = require("../../../helpers/findOutputFiles");

const allCss = new Set();
const allBundles = new Set();

module.exports = {
	findBundle(i, options) {
		const bundle = findOutputFiles(options, new RegExp(`^bundle${i}`))[0];
		const async = findOutputFiles(options, /\.js/, `css${i}`);
		if (bundle) {
			const m = /\.([^.]+)\./.exec(bundle);
			if (m) allBundles.add(m[1]);
		}
		const cssFiles = findOutputFiles(options, /^.*\.[^.]*\.css$/, `css${i}`);
		if (cssFiles.length > 0) {
			allCss.add(cssFiles[0]);
		}

		return [`./css${i}/${async}`, `./${bundle}`];
	},
	afterExecute: () => {
		expect(allBundles.size).toBe(2);
		expect(allCss.size).toBe(1);
	}
};
