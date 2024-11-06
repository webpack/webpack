module.exports = function () {
	return !process.version.startsWith("v10.");
};
