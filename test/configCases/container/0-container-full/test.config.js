module.exports = {
	findBundle: function (i, options) {
		// In node 10 the ESM part of the test doesn't work
		return i === 0 || process.version.startsWith("v10.")
			? "./main.js"
			: "./module/main.mjs";
	}
};
