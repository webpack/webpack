/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (src) {
	return `module.exports = "loader-a" + module.id`;
};
