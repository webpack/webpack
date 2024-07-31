const fs = require("fs");
const path = require("path");

module.exports = () => {
	try {
		fs.symlinkSync(
			path.join(__dirname, "index.js"),
			path.join(__dirname, ".testlink"),
			"file"
		);
		fs.unlinkSync(path.join(__dirname, ".testlink"));
		return true;
	} catch (_err) {
		return false;
	}
};
