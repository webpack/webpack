const loaderPath = require.resolve("./loader");

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	if (this.query === "?load") {
		return `
import { answer } from "./lib";

export default answer;
`;
	}

	const matchResource = `${this.utils.contextify(this.context, this.resourcePath)}.js`;
	const loader = `${this.utils.contextify(this.context, loaderPath)}?load`;
	const remaining = this.utils.contextify(this.context, this.remainingRequest);
	const request = `${matchResource}!=!${loader}!${remaining}`;

	this.async();
	this.loadModule(request, (err, source) => {
		this.callback(err, source);
	});
};
