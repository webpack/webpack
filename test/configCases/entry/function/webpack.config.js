/** @type {import("../../../../").Configuration} */
module.exports = {
	entry() {
		return {
			a: "./a",
			b: ["./b"]
		};
	},
	output: {
		filename: "[name].js"
	}
};
