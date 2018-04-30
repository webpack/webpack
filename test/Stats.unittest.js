/*globals describe it */
"use strict";

const Stats = require("../lib/Stats");
const packageJson = require("../package.json");

describe(
	"Stats",
	() => {
		describe("formatFilePath", () => {
			it("emit the file path and request", () => {
				const mockStats = new Stats({
					children: [],
					errors: ["firstError"],
					hash: "1234",
					compiler: {
						context: ""
					}
				});
				const inputPath =
					"./node_modules/ts-loader!./node_modules/vue-loader/lib/selector.js?type=script&index=0!./src/app.vue";
				const expectPath = `./src/app.vue (${inputPath})\n`;

				expect(mockStats.formatFilePath(inputPath)).toBe(expectPath);
			});
		});

		describe("Error Handling", () => {
			describe("does have", () => {
				it("hasErrors", () => {
					const mockStats = new Stats({
						children: [],
						errors: ["firstError"],
						hash: "1234",
						compiler: {
							context: ""
						}
					});
					expect(mockStats.hasErrors()).toBe(true);
				});
				it("hasWarnings", () => {
					const mockStats = new Stats({
						children: [],
						warnings: ["firstError"],
						hash: "1234",
						compiler: {
							context: ""
						}
					});
					expect(mockStats.hasWarnings()).toBe(true);
				});
			});
			describe("does not have", () => {
				it("hasErrors", () => {
					const mockStats = new Stats({
						children: [],
						errors: [],
						hash: "1234",
						compiler: {
							context: ""
						}
					});
					expect(mockStats.hasErrors()).toBe(false);
				});
				it("hasWarnings", () => {
					const mockStats = new Stats({
						children: [],
						warnings: [],
						hash: "1234",
						compiler: {
							context: ""
						}
					});
					expect(mockStats.hasWarnings()).toBe(false);
				});
			});
			describe("children have", () => {
				it("hasErrors", () => {
					const mockStats = new Stats({
						children: [
							{
								getStats: () =>
									new Stats({
										errors: ["firstError"],
										hash: "5678"
									})
							}
						],
						errors: [],
						hash: "1234"
					});
					expect(mockStats.hasErrors()).toBe(true);
				});
				it("hasWarnings", () => {
					const mockStats = new Stats({
						children: [
							{
								getStats: () =>
									new Stats({
										warnings: ["firstError"],
										hash: "5678"
									})
							}
						],
						warnings: [],
						hash: "1234"
					});
					expect(mockStats.hasWarnings()).toBe(true);
				});
			});
			it("formatError handles string errors", () => {
				const mockStats = new Stats({
					errors: ["firstError"],
					warnings: [],
					assets: [],
					entrypoints: new Map(),
					namedChunkGroups: new Map(),
					chunks: [],
					modules: [],
					children: [],
					hash: "1234",
					mainTemplate: {
						outputOptions: {
							path: ""
						},
						getPublicPath: () => "path"
					},
					compiler: {
						context: ""
					}
				});
				const obj = mockStats.toJson();
				expect(obj.errors[0]).toEqual("firstError");
			});
		});
		describe("toJson", () => {
			it("returns plain object representation", () => {
				const mockStats = new Stats({
					errors: [],
					warnings: [],
					assets: [],
					entrypoints: new Map(),
					chunks: [],
					namedChunkGroups: new Map(),
					modules: [],
					children: [],
					hash: "1234",
					mainTemplate: {
						outputOptions: {
							path: "/"
						},
						getPublicPath: () => "path"
					},
					compiler: {
						context: ""
					}
				});
				const result = mockStats.toJson();
				expect(result).toEqual({
					assets: [],
					assetsByChunkName: {},
					children: [],
					chunks: [],
					entrypoints: {},
					namedChunkGroups: {},
					filteredAssets: 0,
					filteredModules: 0,
					errors: [],
					hash: "1234",
					modules: [],
					outputPath: "/",
					publicPath: "path",
					version: packageJson.version,
					warnings: []
				});
			});
		});
		describe("Presets", () => {
			describe("presetToOptions", () => {
				it("returns correct object with 'Normal'", () => {
					expect(Stats.presetToOptions("Normal")).toEqual({});
				});
				it("truthy values behave as 'normal'", () => {
					const normalOpts = Stats.presetToOptions("normal");
					expect(Stats.presetToOptions("pizza")).toEqual(normalOpts);
					expect(Stats.presetToOptions(true)).toEqual(normalOpts);
					expect(Stats.presetToOptions(1)).toEqual(normalOpts);

					expect(Stats.presetToOptions("verbose")).not.toEqual(normalOpts);
					expect(Stats.presetToOptions(false)).not.toEqual(normalOpts);
				});
				it("returns correct object with 'none'", () => {
					expect(Stats.presetToOptions("none")).toEqual({
						all: false
					});
				});
				it("falsy values behave as 'none'", () => {
					const noneOpts = Stats.presetToOptions("none");
					expect(Stats.presetToOptions("")).toEqual(noneOpts);
					expect(Stats.presetToOptions(null)).toEqual(noneOpts);
					expect(Stats.presetToOptions()).toEqual(noneOpts);
					expect(Stats.presetToOptions(0)).toEqual(noneOpts);
					expect(Stats.presetToOptions(false)).toEqual(noneOpts);
				});
			});
		});
	},
	10000
);
