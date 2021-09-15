/** @type {import("../../../../").Configuration} */
module.exports = {
	entry() {
		return {
			a: "./a"
		};
	},
	output: {
		filename: "[name].js"
	}
};
