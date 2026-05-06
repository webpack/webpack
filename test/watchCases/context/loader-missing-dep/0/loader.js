const path = require("path");
const target = path.resolve(__dirname, "future.json");

/** @type {import("../../../../../").LoaderDefinition} */
module.exports = function () {
	this.addMissingDependency(target);
	const callback = this.async();
	this.fs.stat(target, (err, stat) => {
		if (err && /** @type {NodeJS.ErrnoException} */ (err).code !== "ENOENT") {
			return callback(err);
		}
		callback(
			null,
			`module.exports = ${JSON.stringify({
				exists: Boolean(stat),
				random: Math.random()
			})};`
		);
	});
};
