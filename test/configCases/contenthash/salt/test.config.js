const findOutputFiles = require("../../../helpers/findOutputFiles");

const allAssets = new Set();
const allBundles = new Set();

module.exports = {
	findBundle: function (i, options) {
		const bundle = findOutputFiles(options, new RegExp(`^bundle${i}`))[0];
		allBundles.add(/\.([^.]+)\./.exec(bundle)[1]);

		const assets = findOutputFiles(options, /^img/);
		for (const asset of assets) {
			allAssets.add(asset);
		}

		return `./${bundle}`;
	},
	afterExecute: () => {
		// Since there are exactly 2 unique values of output.hashSalt,
		// there should be exactly 2 unique output hashes for each file.
		expect(allBundles.size).toBe(2);
		expect(allAssets.size).toBe(2);
	}
};
