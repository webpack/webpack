var fs = require("fs");

var findFile = function(files, regex) {
	return files.find(function(file) {
		if (regex.test(file)) {
			return true;
		}
	});
};

const allFilenameHashes = new Set();
const allChunkHashes = new Set();

module.exports = {
	findBundle: function(i, options) {
		var files = fs.readdirSync(options.output.path);

		const filename = findFile(files, new RegExp(`^bundle${i}`));
		const filenameHash = /\.([a-f0-9]+)\.js$/.exec(filename)[1];
		allFilenameHashes.add(filenameHash);

		const chunk = findFile(files, new RegExp(`^chunk${i}`));
		const chunkHash = /\.([a-f0-9]+)\.js$/.exec(chunk)[1];
		allChunkHashes.add(chunkHash);

		return "./" + filename;
	},
	afterExecute: () => {
		expect(allFilenameHashes.size).toBe(2);
		expect(allChunkHashes.size).toBe(2);
	}
};
