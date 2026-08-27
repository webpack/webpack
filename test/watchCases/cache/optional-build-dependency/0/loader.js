const path = require("path");

const target = path.resolve(__dirname, "optional-config.js");

/** @type {import("../../../../../").LoaderDefinition} */
module.exports = function () {
	this.addMissingDependency(target);
	const callback = this.async();
	this.fs.stat(target, (err, stat) => {
		if (err && /** @type {NodeJS.ErrnoException} */ (err).code !== "ENOENT") {
			return callback(err);
		}
		if (stat) {
			this.addDependency(target);
		}
		callback(
			null,
			`module.exports = ${JSON.stringify(stat ? "present" : "absent")};`
		);
	});
};
