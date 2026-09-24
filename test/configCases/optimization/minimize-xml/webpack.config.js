"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");

/** @type {(name: string, options: import("../../../../").Configuration) => import("../../../../").Configuration} */
const config = (name, options) => ({
	mode: "production",
	// Chrome 50 still needs `-webkit-user-select`, so the stylesheet shows the
	// target reached the CSS minifier an SVG's `<style>` is handed to.
	target: "browserslist:chrome 50",
	output: {
		pathinfo: false,
		filename: `${name}.js`,
		assetModuleFilename: `${name}[ext]`
	},
	...options,
	optimization: { minimize: true, minimizer: ["..."], ...options.optimization }
});

module.exports = [
	// futureDefaults turns the XML minimizer on.
	config("future", { experiments: { futureDefaults: true } }),
	// `false` turns it back off.
	config("disabled", {
		experiments: { futureDefaults: true },
		optimization: { minimizeOptions: { xml: false } }
	}),
	// Without futureDefaults an object turns it on.
	config("object", { optimization: { minimizeOptions: { xml: {} } } }),
	// And absent, it stays off.
	config("absent", {}),
	// A minimizer of the user's own that matches `.svg` keeps the type.
	config("claimed", {
		experiments: { futureDefaults: true },
		optimization: {
			minimize: true,
			minimizer: [
				new MinimizerPlugin({
					test: /\.svg$/,
					parallel: false,
					minify: () => ({ code: "<svg/>" })
				}),
				"..."
			]
		}
	})
];
