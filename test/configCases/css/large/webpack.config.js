/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "web",
		mode: "development",
		output: {
			uniqueName: "my-app"
		},
		experiments: {
			css: true
		}
	},
	{
		target: "web",
		mode: "production",
		performance: false,
		experiments: {
			css: true
		}
	}
];
