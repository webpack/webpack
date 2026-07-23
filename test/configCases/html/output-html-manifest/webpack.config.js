"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").WebpackPluginInstance} */
const copyTest = {
	apply(compiler) {
		compiler.hooks.compilation.tap("Test", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "copy-test",
					stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
				},
				() => {
					compilation.emitAsset(
						"test.js",
						new webpack.sources.RawSource(
							fs.readFileSync(path.resolve(__dirname, "test.js"))
						)
					);
				}
			);
		});
	}
};

/** @typedef {false | string | Record<string, EXPECTED_ANY> | ((name: string) => false | string | Record<string, EXPECTED_ANY>)} Manifest */

/** @type {(name: string, manifest: Manifest) => import("../../../../").Configuration} */
const config = (name, manifest) => ({
	name,
	target: "web",
	entry: { [name]: "./src/main.js" },
	output: {
		filename: `${name}.js`,
		htmlFilename: `${name}.html`,
		html: { manifest }
	},
	experiments: { html: true },
	plugins: [copyTest]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// default — nothing injected
	{
		name: "default",
		target: "web",
		entry: { default: "./src/main.js" },
		output: { filename: "default.js", htmlFilename: "default.html", html: {} },
		experiments: { html: true },
		plugins: [copyTest]
	},
	// object — generated, emitted as a hashed .webmanifest with hashed icons
	config("object", {
		name: "My App",
		theme_color: "#317EFB",
		display: "standalone",
		icons: [{ src: "./src/icon.png", sizes: "192x192", type: "image/png" }]
	}),
	// string — link an existing .webmanifest file (its icons are hashed too)
	config("file", "./src/app.webmanifest"),
	// function — receives the page name
	config("fn", (name) => (name === "fn" ? { name: "Fn App" } : false)),
	// authored page — manifest is only injected into webpack-generated pages
	{
		name: "authored",
		target: "web",
		entry: { authored: "./src/page.html" },
		output: {
			filename: "authored.js",
			htmlFilename: "authored.html",
			html: { manifest: { name: "Should Not Appear" } }
		},
		experiments: { html: true },
		optimization: { minimize: false },
		plugins: [copyTest]
	}
];
