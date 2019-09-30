const fs = require("fs");
const path = require("path");

module.exports.remove = function remove(src) {
	if (!fs.existsSync(src)) return;
	const files = fs.readdirSync(src);
	files.forEach(filename => {
		const srcFile = path.join(src, filename);
		const directory = fs.statSync(srcFile).isDirectory();
		if (directory) {
			remove(srcFile);
		} else {
			fs.unlinkSync(srcFile);
		}
	});
};
