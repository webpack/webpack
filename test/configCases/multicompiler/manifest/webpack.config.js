/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		name: "web",
		target: "web",
		entry: {
			page1: "./page1.js",
			page2: "./page2.js"
		},
		output: {
			filename: "[name].js"
		}
	},
	{
		name: "web2",
		target: "web",
		entry: "./page1.js",
		output: {
			filename: "web2.js"
		}
	},
	{
		name: "node",
		target: "node",
		entry: "./node.js",
		experiments: {
			manifest: true
		},
		output: {
			filename: "main.js"
		},
		dependencies: ["web", "web2"]
	}
];
