/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		bundle0: "./require-entry-point",
		a: "./entry-point",
		b: ["./entry-point2"]
	},
	output: {
		filename: "[name].js"
	}
};
