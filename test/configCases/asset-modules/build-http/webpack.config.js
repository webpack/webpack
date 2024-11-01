/** @type {import("../../../../").Configuration} */
const path = require("path");
module.exports = {
	mode: "development",
	experiments: {
		buildHttp: {
			allowedUris: [() => true],
			lockfileLocation: path.resolve(__dirname, "./lock-files/lock.json"),
			cacheLocation: path.resolve(__dirname, "./lock-files/test")
		}
	}
};
