/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		target: "node",
		experiments: {
			outputModule: true
		},
		output: {
			module: true,
			chunkFormat: "module"
		}
	},
	{
		target: "node14.17",
		experiments: {
			outputModule: true
		},
		output: {
			module: true,
			chunkFormat: "module"
		}
	},
	{
		target: "node14.18",
		experiments: {
			outputModule: true
		},
		output: {
			module: true,
			chunkFormat: "module"
		}
	},
	{
		target: "node15",
		experiments: {
			outputModule: true
		},
		output: {
			module: true,
			chunkFormat: "module"
		}
	},
	{
		target: "node16",
		experiments: {
			outputModule: true
		},
		output: {
			module: true,
			chunkFormat: "module"
		}
	},
	{
		target: "browserslist:node 14.18.0, node 16.0.0",
		experiments: {
			outputModule: true
		},
		output: {
			module: true,
			chunkFormat: "module"
		}
	},
	{
		target: "browserslist:node 14.18.0, node 15.0.0, node 16.0.0",
		experiments: {
			outputModule: true
		},
		output: {
			module: true,
			chunkFormat: "module"
		}
	},
	{
		target: "node"
	}
];
