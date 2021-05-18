/** @type {import("../../../../").LoaderDefinition<{}, { minimize: boolean, jsfile: boolean }>} */
module.exports = function () {
	return (
		"module.exports = " +
		JSON.stringify({
			minimize: this.minimize,
			jsfile: this.jsfile
		})
	);
};
