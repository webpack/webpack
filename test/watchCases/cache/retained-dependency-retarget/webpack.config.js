"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration[]} */
module.exports = [
	"request",
	"context",
	"resolve-options",
	"attributes",
	"replacement",
	"dynamic-rule"
].map((variant, index) => ({
	mode: "development",
	cache: { type: "memory" },
	output: { filename: `bundle${index}.js`, clean: false },
	module: {
		unsafeCache: false,
		rules: [
			{ test: /(?:barrel|first|second)\.js$/, sideEffects: false },
			{ with: { variant: "second" }, use: path.join(__dirname, "loader.js") },
			...(variant === "dynamic-rule"
				? [
						{
							test: /first\.js$/,
							issuer: /barrel\.js$/,
							use: () =>
								currentWatchStep.step === "1"
									? [path.join(__dirname, "loader.js")]
									: []
						}
					]
				: [])
		]
	},
	plugins: [
		(compiler) => {
			if (variant === "replacement") {
				new compiler.webpack.NormalModuleReplacementPlugin(
					/first\.js$/,
					(data) => {
						if (
							currentWatchStep.step === "1" &&
							data.contextInfo.issuer ===
								path.join(compiler.context, "barrel.js")
						) {
							data.request = "./second.js";
						}
					}
				).apply(compiler);
			}
			compiler.hooks.compilation.tap("RetargetDependency", (compilation) => {
				for (const name of /** @type {const} */ ([
					"succeedModule",
					"stillValidModule"
				])) {
					compilation.hooks[name].tap("RetargetDependency", (module) => {
						if (currentWatchStep.step !== "1") return;
						if (
							module.identifier() !== path.join(compiler.context, "barrel.js")
						) {
							return;
						}
						if (variant === "context") {
							module.context = path.join(compiler.context, "alternate");
							return;
						}
						if (variant === "resolve-options") {
							module.resolveOptions = {
								...module.resolveOptions,
								alias: {
									"./first.js": path.join(compiler.context, "second.js")
								}
							};
							return;
						}
						for (const dependency of module.dependencies) {
							if (
								"request" in dependency &&
								dependency.request === "./first.js"
							) {
								if (variant === "request") dependency.request = "./second.js";
								if (variant === "attributes" && "attributes" in dependency) {
									dependency.attributes = { variant: "second" };
								}
							}
						}
					});
				}
			});
		}
	]
}));
