const path = require("path");
const directory = path.resolve(__dirname, "directory");

/** @type {import("../../../../../").LoaderDefinition} */
module.exports = function () {
	this.addContextDependency(directory);
	const callback = this.async();
	this.fs.readdir(directory, (err, _files) => {
		if (err) return callback(err);
		const files = /** @type {string[]} */ (_files);
		files.sort();
		callback(null, `module.exports = ${JSON.stringify(files)};`);
	});
};
