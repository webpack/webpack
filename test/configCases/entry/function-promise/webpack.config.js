/** @type {import("../../../../").Configuration} */
module.exports = {
	entry() {
		return Promise.resolve({
			a: "./a",
			b: ["./b"]
		});
	},
	output: {
		filename: "[name].js"
	}
};
