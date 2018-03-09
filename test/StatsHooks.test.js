"use strict";

require("should");

const webpack = require("../lib/webpack");
const MemoryFs = require("memory-fs");

describe("StatsHooks", () => {
	it("should check for working `hash` hook in Stats API", function(done) {
		const compiler = webpack({
			context: __dirname,
			entry: "./fixtures/main1",
			mode: "development"
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.hooks.emit.tap("Test Stats hooks", function(compilation) {
			const stats = compilation.getStats();
			stats.hooks.setValue.for("hash").tap("TestStatsHooks", () => true);
			stats
				.toString({ all: false })
				.should.be.eql("Hash: 1d69cc817d83b753467b");
		});
		compiler.run((err, stats) => {
			if (err) return done(err);
			done();
		});
	});
	it("should check for working `depth` hook in Stats API", function(done) {
		const compiler = webpack({
			context: __dirname,
			entry: "./fixtures/main1",
			mode: "development"
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.hooks.afterEmit.tap("Test Stats hooks", function(compilation) {
			const stats = compilation.getStats();
			stats.hooks.setValue.for("modules").tap("TestStatsHooks", () => true);
			stats.hooks.setValue.for("depth").tap("TestStatsHooks", () => false);
			stats.hooks.setValue.for("maxModules").tap("TestStatsHooks", () => 1);
			const expected = `[./fixtures/main1.js] 146 bytes {main} [built]
    + 3 hidden modules`;
			stats.toString({ all: false }).should.be.eql(expected);
		});
		compiler.run((err, stats) => {
			if (err) return done(err);
			done();
		});
	});
	it("should check for working `chunkModules` hook in Stats API", function(
		done
	) {
		const compiler = webpack({
			context: __dirname,
			entry: "./fixtures/main1",
			mode: "development"
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.hooks.emit.tap("Test Stats hooks", function(compilation) {
			const stats = compilation.getStats();
			stats.hooks.setValue
				.for("chunkModules")
				.tap("TestStatsHooks", () => true);
			stats
				.toString({ all: false })
				.should.be.instanceof(String)
				.and.have.lengthOf(0);
		});
		compiler.run((err, stats) => {
			if (err) return done(err);
			done();
		});
	});
	it("should check for working `version` hook in Stats API", function(done) {
		const compiler = webpack({
			context: __dirname,
			entry: "./fixtures/main1",
			mode: "development"
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.hooks.emit.tap("Test Stats hooks", function(compilation) {
			const stats = compilation.getStats();
			stats.hooks.setValue.for("version").tap("TestStatsHooks", () => true);
			const expected = `Version: webpack ${version}`;
			stats.toString({ all: false }).should.be.eql(expected);
		});
		const version = require("../package.json").version;
		compiler.run((err, stats) => {
			if (err) return done(err);
			done();
		});
	});
	it("should check for working `assets` hook in Stats API", function(done) {
		const compiler = webpack({
			context: __dirname,
			entry: "./fixtures/main1",
			mode: "development"
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.hooks.emit.tap("Test Stats hooks", function(compilation) {
			const stats = compilation.getStats();
			stats.hooks.setValue.for("assets").tap("TestStatsHooks", () => true);
			stats.toString({ all: false }).should.be.eql(" 1 asset");
		});
		compiler.run((err, stats) => {
			if (err) return done(err);
			done();
		});
	});
	it("should check for working `entrypoints` hook in Stats API", function(
		done
	) {
		const compiler = webpack({
			context: __dirname,
			entry: "./fixtures/main1",
			mode: "development"
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.hooks.emit.tap("Test Stats hooks", function(compilation) {
			const stats = compilation.getStats();
			stats.hooks.setValue.for("entrypoints").tap("TestStatsHooks", () => true);
			stats.toString({ all: false }).should.be.eql("Entrypoint main = main.js");
		});
		compiler.run((err, stats) => {
			if (err) return done(err);
			done();
		});
	});
	it("should check for working `chunks` hook in Stats API", function(done) {
		const compiler = webpack({
			context: __dirname,
			entry: "./fixtures/main1",
			mode: "development"
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.hooks.emit.tap("Test Stats hooks", function(compilation) {
			const stats = compilation.getStats();
			stats.hooks.setValue.for("chunks").tap("TestStatsHooks", () => true);
			stats
				.toString({ all: false })
				.should.be.eql(
					"chunk {main} main.js (main) 314 bytes [entry] [rendered]"
				);
		});
		compiler.run((err, stats) => {
			if (err) return done(err);
			done();
		});
	});
	it("should check for working `sortModules` hook in Stats API", function(
		done
	) {
		const compiler = webpack({
			context: __dirname,
			entry: "./fixtures/main1",
			mode: "development"
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.hooks.emit.tap("Test Stats hooks", function(compilation) {
			const stats = compilation.getStats();
			stats.hooks.setValue.for("sortModules").tap("TestStatsHooks", () => true);
			stats.hooks.setValue.for("modules").tap("TestStatsHooks", () => true);
			const expected = `[./fixtures/a.js] 55 bytes {main} [built]
[./fixtures/b.js] 55 bytes {main} [built]
[./fixtures/main1.js] 146 bytes {main} [built]
[./fixtures/node_modules/m1/a.js] 58 bytes {main} [built]`;
			stats.toString({ all: false }).should.be.eql(expected);
		});
		compiler.run((err, stats) => {
			if (err) return done(err);
			done();
		});
	});
	it("should check for working `maxModules` hook in Stats API", function(done) {
		const compiler = webpack({
			context: __dirname,
			entry: "./fixtures/main1",
			mode: "development"
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.hooks.emit.tap("Test Stats hooks", function(compilation) {
			const stats = compilation.getStats();
			stats.hooks.setValue.for("modules").tap("TestStatsHooks", () => true);
			stats.hooks.setValue.for("maxModules").tap("TestStatsHooks", () => 1);
			const expected = `[./fixtures/main1.js] 146 bytes {main} [built]
    + 3 hidden modules`;
			stats.toString({ all: false }).should.be.eql(expected);
		});
		compiler.run((err, stats) => {
			if (err) return done(err);
			done();
		});
	});
	it("should check for not reporting anything through hooks", function(done) {
		const compiler = webpack({
			context: __dirname,
			entry: "./fixtures/main1",
			mode: "development"
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.hooks.afterEmit.tap("Test Stats hooks", function(compilation) {
			const stats = compilation.getStats();
			const list_of_hooks = [
				"performance",
				"hash",
				"env",
				"version",
				"timings",
				"builtAt",
				"assets",
				"entrypoints",
				"chunks",
				"chunkModules",
				"chunkOrigins",
				"modules",
				"nestedModules",
				"depth",
				"cached",
				"cachedAssets",
				"reasons",
				"usedExports",
				"providedExports",
				"optiomizationBailout",
				"children",
				"source",
				"moduleTrace",
				"errors",
				"warnings",
				"warningFilter",
				"publicPath",
				"sortModules",
				"sortChunks",
				"maxModules",
				"outputPath"
			];
			list_of_hooks.forEach(hook_name =>
				stats.hooks.setValue.for(hook_name).tap("Test Stats hooks", () => false)
			);
			stats
				.toString({ all: true })
				.should.be.instanceof(String)
				.and.have.lengthOf(0);
		});
		compiler.run((err, stats) => {
			if (err) return done(err);
			done();
		});
	});
});
