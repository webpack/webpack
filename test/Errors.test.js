"use strict";

/*globals describe it */
const should = require("should");
const path = require("path");

const webpack = require("../lib/webpack");

const base = path.join(__dirname, "fixtures", "errors");

describe("Errors", () => {
	function customOutputFilesystem(c) {
		const files = {};
		c.outputFileSystem = {
			join: path.join.bind(path),
			mkdirp: function(path, callback) {
				callback();
			},
			writeFile: function(name, content, callback) {
				files[name] = content.toString("utf-8");
				callback();
			}
		};
		return files;
	}

	function getErrors(options, callback) {
		options.context = base;
		const c = webpack(options);
		customOutputFilesystem(c);
		c.run((err, stats) => {
			if(err) throw err;
			should.strictEqual(typeof stats, "object");
			stats = stats.toJson({
				errorDetails: false
			});
			should.strictEqual(typeof stats, "object");
			stats.should.have.property("errors");
			stats.should.have.property("warnings");
			Array.isArray(stats.errors).should.be.ok(); // eslint-disable-line no-unused-expressions
			Array.isArray(stats.warnings).should.be.ok(); // eslint-disable-line no-unused-expressions
			callback(stats.errors, stats.warnings);
		});
	}
	it("should throw an error if file doesn't exist", (done) => {
		getErrors({
			entry: "./missingFile"
		}, (errors, warnings) => {
			errors.length.should.be.eql(2);
			warnings.length.should.be.eql(0);
			errors.sort();
			let lines = errors[0].split("\n");
			lines[0].should.match(/missingFile.js/);
			lines[1].should.match(/^Module not found/);
			lines[1].should.match(/\.\/dir\/missing2/);
			lines[2].should.match(/missingFile.js 12:9/);
			lines = errors[1].split("\n");
			lines[0].should.match(/missingFile.js/);
			lines[1].should.match(/^Module not found/);
			lines[1].should.match(/\.\/missing/);
			lines[2].should.match(/missingFile.js 4:0/);
			done();
		});
	});
	it("should report require.extensions as unsupported", (done) => {
		getErrors({
			entry: "./require.extensions"
		}, (errors, warnings) => {
			errors.length.should.be.eql(0);
			warnings.length.should.be.eql(1);
			const lines = warnings[0].split("\n");
			lines[0].should.match(/require.extensions\.js/);
			lines[1].should.match(/require.extensions is not supported by webpack/);
			done();
		});
	});
	it("should warn about case-sensitive module names", (done) => {
		getErrors({
			entry: "./case-sensitive"
		}, (errors, warnings) => {
			if(errors.length === 0) {
				warnings.length.should.be.eql(1);
				const lines = warnings[0].split("\n");
				lines[4].should.match(/FILE\.js/);
				lines[5].should.match(/Used by/);
				lines[6].should.match(/case-sensitive/);
				lines[7].should.match(/file\.js/);
				lines[8].should.match(/Used by/);
				lines[9].should.match(/case-sensitive/);
			} else {
				errors.length.should.be.eql(1);
				warnings.length.should.be.eql(0);
			}
			done();
		});
	});
	it("should warn about NoErrorsPlugin being deprecated in favor of NoEmitOnErrorsPlugin", (done) => {
		getErrors({
			entry: "./no-errors-deprecate",
			plugins: [
				new webpack.NoErrorsPlugin()
			]
		}, (errors, warnings) => {
			warnings.length.should.be.eql(1);
			const lines = warnings[0].split("\n");
			lines[0].should.match(/webpack/);
			lines[0].should.match(/NoErrorsPlugin/);
			lines[0].should.match(/deprecated/);
			lines[1].should.match(/NoEmitOnErrorsPlugin/);
			lines[1].should.match(/instead/);
			done();
		});
	});
	it("should not warn if the NoEmitOnErrorsPlugin is used over the NoErrorsPlugin", (done) => {
		getErrors({
			entry: "./no-errors-deprecate",
			plugins: [
				new webpack.NoEmitOnErrorsPlugin()
			]
		}, (errors, warnings) => {
			errors.length.should.be.eql(0);
			warnings.length.should.be.eql(0);
			done();
		});
	});
	it("should not not emit if NoEmitOnErrorsPlugin is used and there is an error", (done) => {
		getErrors({
			entry: "./missingFile",
			plugins: [
				new webpack.NoEmitOnErrorsPlugin()
			]
		}, (errors, warnings) => {
			errors.length.should.be.eql(2);
			warnings.length.should.be.eql(0);
			errors.sort();
			let lines = errors[0].split("\n");
			lines[0].should.match(/missingFile.js/);
			lines[1].should.match(/^Module not found/);
			lines[1].should.match(/\.\/dir\/missing2/);
			lines[2].should.match(/missingFile.js 12:9/);
			lines = errors[1].split("\n");
			lines[0].should.match(/missingFile.js/);
			lines[1].should.match(/^Module not found/);
			lines[1].should.match(/\.\/missing/);
			lines[2].should.match(/missingFile.js 4:0/);
			done();
		});
	});
	it("should throw an error when using incorrect CommonsChunkPlugin configuration", (done) => {
		getErrors({
			entry: {
				a: "./entry-point",
				b: "./entry-point",
				c: "./entry-point"
			},
			output: {
				filename: "[name].js"
			},
			plugins: [
				new webpack.optimize.CommonsChunkPlugin({
					name: "a",
					filename: "a.js",
					minChunks: Infinity
				}),
				new webpack.optimize.CommonsChunkPlugin({
					name: "b",
					filename: "b.js",
					minChunks: Infinity
				})
			]
		}, (errors, warnings) => {
			errors.length.should.be.eql(1);
			warnings.length.should.be.eql(0);
			const lines = errors[0].split("\n");
			lines[0].should.match(/CommonsChunkPlugin/);
			lines[0].should.match(/non-entry/);
			done();
		});
	});
	it("should throw an error when trying to use [chunkhash] when it's invalid", (done) => {
		getErrors({
			entry: {
				a: "./entry-point",
				b: "./entry-point",
				c: "./entry-point"
			},
			output: {
				filename: "[chunkhash].js"
			},
			plugins: [
				new webpack.HotModuleReplacementPlugin()
			]
		}, (errors, warnings) => {
			errors.length.should.be.eql(3);
			warnings.length.should.be.eql(0);
			errors.forEach((error) => {
				const lines = error.split("\n");
				lines[0].should.match(/chunk (a|b|c)/);
				lines[2].should.match(/\[chunkhash\].js/);
				lines[2].should.match(/use \[hash\] instead/);
			});
			done();
		});
	});
});
