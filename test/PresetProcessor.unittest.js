"use strict";

const PresetProcessor = require("../lib/PresetProcessor");

describe("PresetProcessor", function () {
	it("should merge a preset into the webpack configuration", function () {
		const webpackConfig = {
			presets: [
				{
					plugins: [
						{
							apply: function (compiler) {
								compiler.hooks.done.tap("Test", () => {
									console.log("Hello world!");
								});
							}
						}
					]
				}
			]
		};
		const mergedConfig = PresetProcessor.recursivelyMergePresets(webpackConfig);
		expect(mergedConfig.plugins).toBeDefined();
		expect(mergedConfig.plugins.length).toBe(1);
		expect(mergedConfig.plugins[0].apply).toBeDefined();
	});

	it("should merge multiple presets into the webpack configuration", function () {
		const webpackConfig = {
			presets: [
				{
					plugins: [
						{
							apply: function (compiler) {
								compiler.hooks.done.tap("Test", () => {
									console.log("Hello world!");
								});
							}
						}
					]
				},
				{
					plugins: [
						{
							apply: function (compiler) {
								compiler.hooks.done.tap("Test", () => {
									console.log("Hello world!");
								});
							}
						}
					]
				}
			]
		};
		const mergedConfig = PresetProcessor.recursivelyMergePresets(webpackConfig);
		expect(mergedConfig.plugins).toBeDefined();
		expect(mergedConfig.plugins.length).toBe(2);
		expect(mergedConfig.plugins[0].apply).toBeDefined();
		expect(mergedConfig.plugins[1].apply).toBeDefined();
	});

	it("should merge a preset that has a preset into the webpack configuration", function () {
		const webpackConfig = {
			presets: [
				{
					presets: [
						{
							plugins: [
								{
									apply: function (compiler) {
										compiler.hooks.done.tap("Test", () => {
											console.log("Hello world!");
										});
									}
								}
							]
						}
					]
				}
			]
		};
		const mergedConfig = PresetProcessor.recursivelyMergePresets(webpackConfig);
		expect(mergedConfig.plugins).toBeDefined();
		expect(mergedConfig.plugins.length).toBe(1);
		expect(mergedConfig.plugins[0].apply).toBeDefined();
	});

	it("should merge a preset that has a preset that has a preset into the webpack configuration", function () {
		const webpackConfig = {
			presets: [
				{
					presets: [
						{
							presets: [
								{
									plugins: [
										{
											apply: function (compiler) {
												compiler.hooks.done.tap("Test", () => {
													console.log("Hello world!");
												});
											}
										}
									]
								}
							]
						}
					]
				}
			]
		};
		const mergedConfig = PresetProcessor.recursivelyMergePresets(webpackConfig);
		expect(mergedConfig.plugins).toBeDefined();
		expect(mergedConfig.plugins.length).toBe(1);
		expect(mergedConfig.plugins[0].apply).toBeDefined();
	});

	it("should merge correctly merge two presets that have loaders defined", function () {
		const webpackConfig = {
			presets: [
				{
					module: {
						rules: [
							{
								test: /\.js$/,
								use: [
									{
										loader: "babel-loader",
										options: {
											presets: ["@babel/preset-env"]
										}
									}
								]
							}
						]
					}
				},
				{
					module: {
						rules: [
							{
								test: /\.js$/,
								use: [
									{
										loader: "babel-loader",
										options: {
											presets: ["@babel/preset-react"]
										}
									}
								]
							}
						]
					}
				}
			]
		};
		const mergedConfig = PresetProcessor.recursivelyMergePresets(webpackConfig);
		expect(mergedConfig.module.rules).toBeDefined();
		expect(mergedConfig.module.rules.length).toBe(1);
		expect(mergedConfig.module.rules[0].use).toBeDefined();
		expect(mergedConfig.module.rules[0].use.length).toBe(1);
		expect(mergedConfig.module.rules[0].use[0].loader).toBe("babel-loader");
		expect(mergedConfig.module.rules[0].use[0].options).toBeDefined();
		expect(mergedConfig.module.rules[0].use[0].options.presets).toBeDefined();
		expect(mergedConfig.module.rules[0].use[0].options.presets).toStrictEqual([
			"@babel/preset-env",
			"@babel/preset-react"
		]);
	});

	it("should merge loaders with different syntax correctly", function () {
		const webpackConfig = {
			presets: [
				{
					module: {
						rules: [
							{
								test: /\.js$/,
								use: [
									{
										loader: "babel-loader",
										options: {
											presets: ["@babel/preset-env"]
										}
									}
								]
							}
						]
					}
				},
				{
					module: {
						rules: [
							{
								test: /\.js$/,
								use: ["babel-loader"]
							}
						]
					}
				}
			]
		};
		const mergedConfig = PresetProcessor.recursivelyMergePresets(webpackConfig);
		expect(mergedConfig.module.rules).toBeDefined();
		expect(mergedConfig.module.rules.length).toBe(1);
		expect(mergedConfig.module.rules[0].use[0].options.presets).toStrictEqual([
			"@babel/preset-env"
		]);
		expect(mergedConfig.module.rules[0].use[1]).toBe("babel-loader");
	});

	/**
	 * This test is to ensure that the mergeWithRules function is working correctly with loaders.
	 * @see https://github.com/survivejs/webpack-merge/issues/191
	 */
	it("should not merge loaders with different include array", function () {
		const webpackConfig = {
			presets: [
				{
					module: {
						rules: [
							{
								test: /\.(j|t)sx?$/,
								use: [
									{
										loader: "null-loader"
									}
								],
								include: ["package1", "package2"]
							}
						]
					}
				},
				{
					module: {
						rules: [
							{
								test: /\.(j|t)sx?$/,
								use: [
									{
										loader: "babel-loader",
										options: {
											envName: "native"
										}
									}
								],
								include: ["package3", "package4"]
							}
						]
					}
				}
			]
		};

		const mergedConfig = PresetProcessor.recursivelyMergePresets(webpackConfig);
		expect(mergedConfig.module.rules.length).toBe(2);
		expect(mergedConfig.module.rules[0].use[0].loader).toBe("null-loader");
		expect(mergedConfig.module.rules[0].test).toEqual(/\.(j|t)sx?$/);
		expect(mergedConfig.module.rules[0].include).toStrictEqual([
			"package1",
			"package2"
		]);
		expect(mergedConfig.module.rules[1].use[0].loader).toBe("babel-loader");
		expect(mergedConfig.module.rules[1].test).toEqual(/\.(j|t)sx?$/);
		expect(mergedConfig.module.rules[1].include).toStrictEqual([
			"package3",
			"package4"
		]);
	});

	it("should merge loaders with different exclude array", function () {
		const webpackConfig = {
			presets: [
				{
					module: {
						rules: [
							{
								test: /\.(j|t)sx?$/,
								use: [
									{
										loader: "null-loader"
									}
								],
								exclude: ["package1", "package2"]
							}
						]
					}
				},
				{
					module: {
						rules: [
							{
								test: /\.(j|t)sx?$/,
								use: [
									{
										loader: "babel-loader",
										options: {
											envName: "native"
										}
									}
								],
								exclude: ["package3", "package4"]
							}
						]
					}
				}
			]
		};

		const mergedConfig = PresetProcessor.recursivelyMergePresets(webpackConfig);
		expect(mergedConfig.module.rules.length).toBe(2);
		expect(mergedConfig.module.rules[0].use[0].loader).toBe("null-loader");
		expect(mergedConfig.module.rules[0].test).toEqual(/\.(j|t)sx?$/);
		expect(mergedConfig.module.rules[0].exclude).toStrictEqual([
			"package1",
			"package2"
		]);
		expect(mergedConfig.module.rules[1].use[0].loader).toBe("babel-loader");
		expect(mergedConfig.module.rules[1].test).toEqual(/\.(j|t)sx?$/);
		expect(mergedConfig.module.rules[1].exclude).toStrictEqual([
			"package3",
			"package4"
		]);
	});

	it("should not merge rules with one include array and one with exclude array", function () {
		const webpackConfig = {
			presets: [
				{
					module: {
						rules: [
							{
								test: /\.(j|t)sx?$/,
								use: [
									{
										loader: "babel-loader"
									}
								],
								include: ["package1", "package2"]
							}
						]
					}
				},
				{
					module: {
						rules: [
							{
								test: /\.(j|t)sx?$/,
								use: [
									{
										loader: "babel-loader"
									}
								],
								exclude: ["package3", "package4"]
							}
						]
					}
				}
			]
		};

		const mergedConfig = PresetProcessor.recursivelyMergePresets(webpackConfig);
		expect(mergedConfig.module.rules.length).toBe(2);
		expect(mergedConfig.module.rules[0].use[0].loader).toBe("babel-loader");
		expect(mergedConfig.module.rules[0].test).toEqual(/\.(j|t)sx?$/);
		expect(mergedConfig.module.rules[0].include).toStrictEqual([
			"package1",
			"package2"
		]);
		expect(mergedConfig.module.rules[1].use[0].loader).toBe("babel-loader");
		expect(mergedConfig.module.rules[1].test).toEqual(/\.(j|t)sx?$/);
		expect(mergedConfig.module.rules[1].exclude).toStrictEqual([
			"package3",
			"package4"
		]);
	});

	it("should merge splitChunks correctly", function () {
		const webpackConfig = {
			presets: [
				{
					optimization: {
						splitChunks: {
							cacheGroups: {
								vendor: {
									test: /[\\/]node_modules[\\/]/,
									name(module) {
										const packageName = module.context.match(
											/[\\/]node_modules[\\/](.*?)([\\/]|$)/
										)[1];
										return `module.${packageName.replace("@", "")}`; // Naming convention for module chunks
									}
								}
							}
						}
					}
				},
				{
					optimization: {
						chunks: "all",
						splitChunks: {
							cacheGroups: {
								styles: {
									name: "styles",
									test: /\.scss$/,
									chunks: "async",
									enforce: true
								}
							}
						}
					}
				},
				{
					optimization: {
						chunks: "all",
						splitChunks: {
							cacheGroups: {
								styles: {
									name: "styles2",
									test: /\.scss$/,
									chunks: "async",
									enforce: false
								}
							}
						}
					}
				}
			]
		};
		const mergedConfig = PresetProcessor.recursivelyMergePresets(webpackConfig);
		expect(mergedConfig.optimization).toMatchInlineSnapshot(`
		Object {
		  "chunks": "all",
		  "splitChunks": Object {
		    "cacheGroups": Object {
		      "styles": Object {
		        "chunks": "async",
		        "enforce": false,
		        "name": "styles2",
		        "test": /\\\\\\.scss\\$/,
		      },
		      "vendor": Object {
		        "name": [Function],
		        "test": /\\[\\\\\\\\/\\]node_modules\\[\\\\\\\\/\\]/,
		      },
		    },
		  },
		}
	`);
	});
});
