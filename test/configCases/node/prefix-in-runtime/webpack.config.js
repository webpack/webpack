"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		target: "node",
		output: {
			module: true,
			chunkFormat: "module"
		}
	},
	{
		target: "node14.17",
		output: {
			module: true,
			chunkFormat: "module"
		}
	},
	{
		target: "node14.18",
		output: {
			module: true,
			chunkFormat: "module"
		}
	},
	{
		target: "node15",
		output: {
			module: true,
			chunkFormat: "module"
		}
	},
	{
		target: "node16",
		output: {
			module: true,
			chunkFormat: "module"
		}
	},
	{
		target: "browserslist:node 14.18.0, node 16.0.0",
		output: {
			module: true,
			chunkFormat: "module"
		}
	},
	{
		target: "browserslist:node 14.18.0, node 15.0.0, node 16.0.0",
		output: {
			module: true,
			chunkFormat: "module"
		}
	},
	{
		target: "node"
	}
];
