module.exports = function () {
	return process.version.slice(0, 4) !== "v10.";
};
