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

/** @typedef {{ href: string, sizes?: string, media?: string, color?: string, type?: string, crossorigin?: "anonymous" | "use-credentials" }} FaviconIcon */
/** @typedef {string | FaviconIcon | (string | FaviconIcon)[]} FaviconValue */
/** @typedef {boolean | string | Record<string, FaviconValue> | ((name: string) => boolean | string | Record<string, FaviconValue>)} Favicon */

/** @type {(name: string, favicon?: Favicon) => import("../../../../").Configuration} */
const config = (name, favicon) => ({
	name,
	target: "web",
	entry: { [name]: "./src/main.js" },
	output: {
		filename: "[name].js",
		htmlFilename: `${name}.html`,
		html: favicon === undefined ? true : { favicon }
	},
	experiments: { html: true },
	plugins: [copyTest]
});

/** @type {(name: string, entry: string) => import("../../../../").Configuration} */
const authored = (name, entry) => ({
	name,
	target: "web",
	entry: { [name]: entry },
	output: {
		filename: "[name].js",
		htmlFilename: `${name}.html`,
		// `favicon: true` must not touch an authored page that already has an
		// icon, and (like Vite) must not inject into an authored page at all.
		html: { favicon: true }
	},
	experiments: { html: true },
	plugins: [copyTest]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// default (html: true, favicon unspecified) — nothing injected
	config("default", undefined),
	// opt-in webpack logo
	config("logo", true),
	// disabled explicitly
	config("off", false),
	// user-provided icon path
	config("custom", "./src/icon.svg"),
	// user-provided non-svg icon — the link's type follows the file format
	config("custom-png", "./src/icon.png"),
	// object notation — one <link> per rel, each hashed with its own type
	config("object", {
		icon: "./src/icon.svg",
		"apple-touch-icon": "./src/icon.png"
	}),
	// object icon with extra link attributes (sizes/type kept, href hashed)
	config("attrs", {
		"apple-touch-icon": { href: "./src/icon.png", sizes: "180x180" },
		"mask-icon": { href: "./src/icon.svg", color: "#5bbad5" }
	}),
	// array of icons under one rel — several sizes / a dark-mode media variant
	config("array", {
		icon: [
			{ href: "./src/icon.png", sizes: "16x16" },
			{ href: "./src/icon.png", sizes: "32x32", type: "image/png" },
			{ href: "./src/icon.svg", media: "(prefers-color-scheme: dark)" }
		]
	}),
	// function notation — receives the page name, returns any favicon form
	config("fn", (name) => (name === "fn" ? "./src/icon.svg" : false)),
	// authored page already declares a favicon — must stay the only one
	authored("authored-has-icon", "./src/page-has-icon.html"),
	// authored page without a favicon — webpack does not inject one
	authored("authored-no-icon", "./src/page-no-icon.html")
];
