const findOutputFiles = require("../../../helpers/findOutputFiles");

const allCss = new Set();
const allBundles = new Set();

module.exports = {
	findBundle: function (i, options) {
		const bundle = findOutputFiles(options, new RegExp(`^bundle${i}`))[0];
		allBundles.add(/\.([^.]+)\./.exec(bundle)[1]);
		const css = findOutputFiles(options, /^.*\.[^.]*\.css$/, `css${i}`)[0];
		allCss.add(css);
		return `./${bundle}`;
	},
	afterExecute: () => {
		expect(allBundles.size).toBe(7);
		expect(allCss.size).toBe(7);
	}
};
