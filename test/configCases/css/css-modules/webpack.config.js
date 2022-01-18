/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "web",
		mode: "development",
		experiments: {
			css: true
		}
	},
	{
		target: "web",
		mode: "production",
		output: {
			uniqueName: "my-app"
		},
		experiments: {
			css: true
		}
	}
];
