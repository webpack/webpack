const { getRemainingRequest, stringifyRequest } = require("loader-utils");

const loaderPath = require.resolve("./loader");

module.exports = function () {
	if (this.query === "?load") {
		return `
import { answer } from "./lib";

export default answer;
`
	}

	const matchResource = `${this.resourcePath}.js`;
	const loader = `${loaderPath}?load`;
	const remaining = getRemainingRequest(this);
	const request = JSON.parse(stringifyRequest(this, `${matchResource}!=!${loader}!${remaining}`));

	this.async();
	this.loadModule(request, (err, source) => {
		this.callback(err, source)
	});
};
