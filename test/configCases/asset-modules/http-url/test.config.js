const fs = require("fs");
const path = require("path");

module.exports = {
	beforeExecute() {
		try {
			fs.unlinkSync(path.join(__dirname, "dev-defaults.webpack.lock"));
		} catch (e) {}
	},
	afterExecute() {
		try {
			fs.unlinkSync(path.join(__dirname, "dev-defaults.webpack.lock"));
		} catch (e) {}
	}
};
