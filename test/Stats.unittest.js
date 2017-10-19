/*globals describe it */
"use strict";

require("should");

const Stats = require("../lib/Stats");

describe("Stats", () => {
	describe("Error Handling", () => {
		describe("does have", () => {
			it("hasErrors", () => {
				const mockStats = new Stats({
					errors: ["firstError"],
					hash: "1234"
				});
				mockStats.hasErrors().should.be.ok();
			});
			it("hasWarnings", () => {
				const mockStats = new Stats({
					warnings: ["firstError"],
					hash: "1234"
				});
				mockStats.hasWarnings().should.be.ok();
			});
		});
		describe("does not have", () => {
			it("hasErrors", () => {
				const mockStats = new Stats({
					errors: [],
					hash: "1234"
				});
				mockStats.hasErrors().should.not.be.ok();
			});
			it("hasWarnings", () => {
				const mockStats = new Stats({
					warnings: [],
					hash: "1234"
				});
				mockStats.hasWarnings().should.not.be.ok();
			});
		});
		it("formatError handles string errors", () => {
			const mockStats = new Stats({
				errors: ["firstError"],
				warnings: [],
				assets: [],
				entrypoints: {},
				chunks: [],
				modules: [],
				children: [],
				hash: "1234",
				mainTemplate: {
					getPublicPath: () => "path"
				}
			});
			const obj = mockStats.toJson();
			obj.errors[0].should.be.equal("firstError");
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
});
