const path = require("path");

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	const callback = this.async();

	this.resolve(this.context, "./b.js", (err, result) => {
		callback(err, `module.exports = ${JSON.stringify(path.basename(/** @type {string} */ (result)))};`)
	});
};
