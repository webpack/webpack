/** @type {import("../../../../").LoaderDefinitionFunction} */
exports.default = function (source) {
	const ref = JSON.parse(source);
	const callback = this.async();
	this.importModule("../loader!" + ref, {}, (err, exports) => {
		if (err) {
			callback(null, JSON.stringify(`err: ${err && err.message}`));
		} else {
			callback(null, JSON.stringify(`source: ${exports}`));
		}
	});
};
