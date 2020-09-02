const path = require("path");
const { ModuleFederationPlugin } = require("../../").container;
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
	chunkModules: true,
	chunkOrigins: true
};
module.exports = (env = "development") => [
	// For this example we have 3 configs in a single file
	// In practice you probably would have separate config
	// maybe even separate repos for each build.
	// For Module Federation there is not compile-time dependency
	// between the builds.
	// Each one can have different config options.
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

				// list of shared modules with optional options
				shared: {
					// specifying a module request as shared module
					// will provide all used modules matching this name (version from package.json)
					// and consume shared modules in the version specified in dependencies from package.json
					// (or in dev/peer/optionalDependencies)
					// So it use the highest available version of this package matching the version requirement
					// from package.json, while providing it's own version to others.
					react: {
						singleton: true // make sure only a single react module is used
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

				// list of shared modules
				shared: [
					// date-fns is shared with the other remote, app doesn't know about that
					"date-fns",
					{
						react: {
							singleton: true // must be specified in each config
						}
					}
				]
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

				shared: [
					// All (used) requests within lodash are shared.
					"lodash/",
					"date-fns",
					{
						react: {
							// Do not load our own version.
							// There must be a valid shared module available at runtime.
							// This improves build time as this module doesn't need to be compiled,
							// but it opts-out of possible fallbacks and runtime version upgrade.
							import: false,
							singleton: true
						}
					}
				]
			})
		],
		stats
	}
];
