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
});
