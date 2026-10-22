/** @type {import("../../../../..").LoaderDefinition} */
module.exports = function () {
	const callback = this.async();
	this.loadModule("./choice", (error, source) => {
		callback(error, source);
	});
};
