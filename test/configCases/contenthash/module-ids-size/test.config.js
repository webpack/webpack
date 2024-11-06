const findOutputFiles = require("../../../helpers/findOutputFiles");

const allAssets = new Set();
const allBundles = new Set();

module.exports = {
	findBundle: function (i, options) {
		const bundle = findOutputFiles(options, new RegExp(`^bundle${i}`))[0];

		allBundles.add(/\.([^.]+)\./.exec(bundle)[1]);

		let asset;

		switch (i) {
			case 0:
				asset = findOutputFiles(options, /^1\.[^.]*\.jpg$/, "img")[0];
				break;
		}

		if (asset) allAssets.add(asset);

		return `./${bundle}`;
	},
	afterExecute: () => {
		// Bundles have the same contenthash
		expect(allBundles.size).toBe(1);
	}
};
