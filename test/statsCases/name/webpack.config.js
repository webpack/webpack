/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		name: require.resolve("./app.js"),
		mode: "production",
		entry: "./app.js",
		output: {
			filename: "bundle1.js"
		}
	},
	{
		name: require.resolve("./server.js"),
		mode: "production",
		entry: "./server.js",
		output: {
			filename: "bundle2.js"
		}
	}
];
