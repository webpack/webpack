module.exports = function () {
	const major = process.version.split(".")[0];
	return major !== "v10" && major !== "v12";
};
