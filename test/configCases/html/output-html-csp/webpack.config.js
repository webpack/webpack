"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");
const HtmlModulesPlugin = require("../../../../lib/html/HtmlModulesPlugin");

// Removes the 2nd inline `<style>` and adds an attribute to the 1st via
// `transformTags`, to prove the single-pass CSP hashes the tags as
// `transformTags` left them (removed style dropped, kept style still hashed).
/** @type {import("../../../../").WebpackPluginInstance} */
const dropRedStyle = {
	apply(compiler) {
		compiler.hooks.compilation.tap("DropRedStyle", (compilation) => {
			HtmlModulesPlugin.getCompilationHooks(
				/** @type {EXPECTED_ANY} */ (compilation)
			).transformTags.tap("DropRedStyle", (tags) => {
				const styles = tags.filter((t) => t.tag === "style");
				if (styles[0]) styles[0].attrs["data-x"] = "1";
				if (styles[1]) styles[1].remove = true;
			});
		});
	}
};

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
	config("inline-script", true, "./src/main.js", { inline: "script" }),
	// csp + transformTags: the removed <style> is dropped from the hashes, the
	// kept (attribute-changed) <style> is still hashed
	{
		...config("transform", true, "./src/two-inline.html"),
		plugins: [copyTest, dropRedStyle]
	},
	// a fragment with no <head>: the CSP meta is prepended to the page
	config("fragment", true, "./src/fragment.html")
];
