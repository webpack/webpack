const path = require("path");

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	const callback = this.async();

	this.resolve(this.context, "./b.js", (err, result, request) => {
		callback(err, `module.exports = ${JSON.stringify(path.basename(result))};`)
	});
};
