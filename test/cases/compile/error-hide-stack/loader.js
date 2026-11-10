/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	throw Object.assign(new Error("Message"), {
		stack: "Stack",
		hideStack: true
	});
};
