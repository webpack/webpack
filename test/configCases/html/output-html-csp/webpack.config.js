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

/** @typedef {boolean | { policy?: Record<string, string | string[]>, hashFunction?: "sha256" | "sha384" | "sha512", nonce?: string }} Csp */

/** @type {(name: string, csp: Csp, entry?: string, extra?: { inline?: "script" | "style" | boolean }) => import("../../../../").Configuration} */
const config = (name, csp, entry = "./src/page.html", extra = {}) => ({
	name,
	target: "web",
	entry: { [name]: entry },
	output: {
		filename: `${name}.js`,
		htmlFilename: `${name}.html`,
		html: { csp, ...extra }
	},
	experiments: { html: true, css: true },
	optimization: { minimize: false },
	plugins: [copyTest]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// no csp — nothing injected
	config("default", false),
	// csp: true — strict baseline + a sha256 of the inline <style>
	config("hash", true),
	// nonce — placeholder on injected tags + a matching 'nonce-…' source
	config("nonce", { nonce: "__NONCE__" }),
	// custom policy directive + a non-default hash algorithm
	config("policy", {
		hashFunction: "sha512",
		policy: { "img-src": ["'self'", "data:"] }
	}),
	// authored page already declares a CSP — must be left untouched
	config("existing", true, "./src/has-csp.html"),
	// a JS entry whose injected script is inlined — its body is hashed too
	config("inline-script", true, "./src/main.js", { inline: "script" })
];
