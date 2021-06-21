/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	var cb = this.async();
	setTimeout(function () {
		cb(null, source);
	}, 500);
};
