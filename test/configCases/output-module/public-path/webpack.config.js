const path = require("path");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) => [
	{
		devtool: false,
		target: "web",
		output: {
			module: true,
			publicPath: "auto"
		},
		experiments: {
			outputModule: true
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			module: true,
			publicPath: "auto",
			chunkFilename: "async/[id].bundle1.mjs"
		},
		experiments: {
			outputModule: true
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			module: true,
			publicPath: "auto",
			filename: "initial/bundle2.mjs",
			chunkFilename: "async/[id].bundle2.mjs"
		},
		experiments: {
			outputModule: true
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			path: path.resolve(testPath, "./bundle3"),
			module: true,
			publicPath: "auto",
			filename: "initial/bundle3.mjs",
			chunkFilename: "async/[id].bundle3.mjs"
		},
		experiments: {
			outputModule: true
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			module: true,
			publicPath: ""
		},
		experiments: {
			outputModule: true
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			module: true,
			publicPath: "",
			chunkFilename: "async/[id].bundle5.mjs"
		},
		experiments: {
			outputModule: true
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			module: true,
			publicPath: "",
			filename: "initial/bundle6.mjs",
			chunkFilename: "async/[id].bundle6.mjs"
		},
		experiments: {
			outputModule: true
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			path: path.resolve(testPath, "./bundle7"),
			module: true,
			publicPath: "",
			filename: "initial/bundle7.mjs",
			chunkFilename: "async/[id].bundle7.mjs"
		},
		experiments: {
			outputModule: true
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			module: true,
			publicPath: "https://example.com/public/path/"
		},
		experiments: {
			outputModule: true
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			module: true,
			publicPath: "https://example.com/public/path/",
			chunkFilename: "async/[id].bundle9.mjs"
		},
		experiments: {
			outputModule: true
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			module: true,
			publicPath: "https://example.com/public/path/",
			filename: "initial/bundle10.mjs",
			chunkFilename: "async/[id].bundle10.mjs"
		},
		experiments: {
			outputModule: true
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			path: path.resolve(testPath, "./bundle11"),
			module: true,
			publicPath: "https://example.com/public/path/",
			filename: "initial/bundle11.mjs",
			chunkFilename: "async/[id].bundle11.mjs"
		},
		experiments: {
			outputModule: true
		}
	},
	{
		devtool: false,
		target: "node",
		output: {
			path: path.resolve(testPath, "./bundle12"),
			module: true,
			publicPath: "auto",
			filename: "initial/bundle12.mjs",
			chunkFilename: "async/[id].bundle12.mjs"
		},
		experiments: {
			outputModule: true
		}
	},
	{
		devtool: false,
		target: ["node", "web"],
		output: {
			path: path.resolve(testPath, "./bundle13"),
			module: true,
			publicPath: "auto",
			filename: "initial/bundle13.mjs",
			chunkFilename: "async/[id].bundle13.mjs"
		},
		experiments: {
			outputModule: true
		}
	},
	{
		devtool: false,
		target: "web",
		output: {
			path: path.resolve(testPath, "./bundle14"),
			module: true,
			publicPath: "/bundle14/",
			filename: "initial/bundle14.mjs",
			chunkFilename: "async/[id].bundle14.mjs"
		},
		experiments: {
			outputModule: true
		}
	}
];
