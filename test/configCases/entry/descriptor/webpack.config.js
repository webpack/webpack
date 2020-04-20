/** @type {import("../../../../").Configuration} */
module.exports = {
	entry() {
		return {
			a: { import: "./a" },
			b: { import: ["./b"] }
		};
	},
	output: {
		filename: "[name].js"
	}
};
