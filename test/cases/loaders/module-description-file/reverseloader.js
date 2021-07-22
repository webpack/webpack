/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (content) {
	return content.split("").reverse().join("");
};
