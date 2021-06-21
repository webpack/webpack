/** @type {import("../../../../../").LoaderDefinition} */
module.exports = function (content) {
	var cb = this.async();
	if (!cb) throw new Error("Loader should allow async mode");
	if (cb !== this.callback)
		throw new Error("result of this.async() should be equal to this.callback");
	process.nextTick(function () {
		cb(null, content);
	});
};
