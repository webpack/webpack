/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "web",
		mode: "development",
		output: {
			uniqueName: "my-app",
			cssHeadDataCompression: true
		},
		experiments: {
			css: true
		}
	},
	{
		target: "web",
		mode: "production",
		output: {
			cssHeadDataCompression: false
		},
		performance: false,
		experiments: {
			css: true
		}
	}
];
