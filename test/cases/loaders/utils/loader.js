/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	return `module.exports = {
	request1: ${JSON.stringify(
		this.utils.contextify(
			this.context,
			this.utils.absolutify(this.context, "./index.js")
		)
	)},
	request2: ${JSON.stringify(
		this.utils.contextify(this.context, this.resourcePath)
	)}
}`;
};
