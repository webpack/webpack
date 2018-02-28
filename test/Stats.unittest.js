/*globals describe it */
"use strict";

require("should");

const Stats = require("../lib/Stats");
const packageJson = require("../package.json");

describe(
	"Stats",
	() => {
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
					mockStats.hasErrors().should.be.ok();
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
					mockStats.hasWarnings().should.be.ok();
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
					mockStats.hasErrors().should.not.be.ok();
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
					mockStats.hasWarnings().should.not.be.ok();
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
					mockStats.hasErrors().should.be.ok();
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
					mockStats.hasWarnings().should.be.ok();
				});
			});
			it("formatError handles string errors", () => {
				const mockStats = new Stats({
					errors: ["firstError"],
					warnings: [],
					assets: [],
					entrypoints: new Map(),
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
				obj.errors[0].should.be.equal("firstError");
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
				result.should.deepEqual({
					assets: [],
					assetsByChunkName: {},
					children: [],
					chunks: [],
					entrypoints: {},
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
					Stats.presetToOptions("Normal").should.eql({});
				});
				it("truthy values behave as 'normal'", () => {
					const normalOpts = Stats.presetToOptions("normal");
					Stats.presetToOptions("pizza").should.eql(normalOpts);
					Stats.presetToOptions(true).should.eql(normalOpts);
					Stats.presetToOptions(1).should.eql(normalOpts);

					Stats.presetToOptions("verbose").should.not.eql(normalOpts);
					Stats.presetToOptions(false).should.not.eql(normalOpts);
				});
				it("returns correct object with 'none'", () => {
					Stats.presetToOptions("none").should.eql({
						all: false
					});
				});
				it("falsy values behave as 'none'", () => {
					const noneOpts = Stats.presetToOptions("none");
					Stats.presetToOptions("").should.eql(noneOpts);
					Stats.presetToOptions(null).should.eql(noneOpts);
					Stats.presetToOptions().should.eql(noneOpts);
					Stats.presetToOptions(0).should.eql(noneOpts);
					Stats.presetToOptions(false).should.eql(noneOpts);
				});
			});
		});
	},
	10000
);
