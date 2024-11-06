/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	externalsPresets: { web: false, webAsync: true },
	experiments: {
		css: true
	}
};
