const findOutputFiles = require("../../../helpers/findOutputFiles");

const allFilenameHashes = new Set();
const allChunkHashes = new Set();

module.exports = {
	findBundle: function(i, options) {
		const filename = findOutputFiles(options, new RegExp(`^bundle${i}`))[0];
		const filenameHash = /\.([a-f0-9]+)\.js$/.exec(filename)[1];
		allFilenameHashes.add(filenameHash);

		const chunk = findOutputFiles(options, new RegExp(`^chunk${i}`))[0];
		const chunkHash = /\.([a-f0-9]+)\.js$/.exec(chunk)[1];
		allChunkHashes.add(chunkHash);

		return "./" + filename;
	},
	afterExecute: () => {
		expect(allFilenameHashes.size).toBe(2);
		expect(allChunkHashes.size).toBe(2);
	}
};
