const path = require("path");
const { ModuleFederationPlugin } = require("../../").container;
const devDeps = require("../../package.json").devDependencies;
const rules = [
	{
		test: /\.js$/,
		include: path.resolve(__dirname, "src"),
		use: {
			loader: "babel-loader",
			options: {
				presets: ["@babel/react"]
			}
		}
	}
];
const optimization = {
	chunkIds: "named", // for this example only: readable filenames in production too
	nodeEnv: "production" // for this example only: always production version of react
};
const stats = {
	chunks: true,
	modules: false,
	chunkModules: false,
	chunkRootModules: true,
	chunkOrigins: true
};
module.exports = (env = "development") => [
	{
		name: "app",
		mode: env,
		entry: {
			app: "./src/index.js"
		},
		output: {
			filename: "[name].js",
			path: path.resolve(__dirname, "dist/aaa"),
			publicPath: "dist/aaa/",

			// Each build needs a unique name
			// to avoid runtime collisions
			// The default uses "name" from package.json
			uniqueName: "module-federation-aaa"
		},
		module: { rules },
		optimization,
		plugins: [
			new ModuleFederationPlugin({
				// List of remotes with URLs
				remotes: {
					"mfe-b": "mfeBBB@/dist/bbb/mfeBBB.js",
					"mfe-c": "mfeCCC@/dist/ccc/mfeCCC.js"
				},

				// list of shared modules with version requirement and other options
				shared: {
					react: {
						singleton: true, // make sure only a single react module is used
						requiredVersion: devDeps.react // e. g. "^16.8.0"
					}
				}
			})
		],
		stats
	},
	{
		name: "mfe-b",
		mode: env,
		entry: {},
		output: {
			filename: "[name].js",
			path: path.resolve(__dirname, "dist/bbb"),
			publicPath: "dist/bbb/",
			uniqueName: "module-federation-bbb"
		},
		module: { rules },
		optimization,
		plugins: [
			new ModuleFederationPlugin({
				// A unique name
				name: "mfeBBB",

				// List of exposed modules
				exposes: {
					"./Component": "./src-b/Component"
				},

				// list of shared modules with version requirement and other options
				// Here date-fns is shared with the other remote, host doesn't know about that
				shared: {
					"date-fns": devDeps["date-fns"], // e. g. "^2.12.0"
					react: {
						singleton: true, // must be specified in each config
						requiredVersion: devDeps.react
					}
				}
			})
		],
		stats
	},
	{
		name: "mfe-c",
		mode: env,
		entry: {},
		output: {
			filename: "[name].js",
			path: path.resolve(__dirname, "dist/ccc"),
			publicPath: "dist/ccc/",
			uniqueName: "module-federation-ccc"
		},
		module: { rules },
		optimization,
		plugins: [
			new ModuleFederationPlugin({
				name: "mfeCCC",

				exposes: {
					"./Component": "./src-c/Component",
					"./Component2": "./src-c/LazyComponent"
				},

				shared: {
					"date-fns": devDeps["date-fns"],
					lodash: devDeps["lodash"],
					react: {
						singleton: true,
						requiredVersion: devDeps.react
					}
				}
			})
		],
		stats
	}
];
