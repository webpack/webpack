/*globals describe it */
require("should");
var path = require("path");
var fs = require("fs");

var webpack = require("../lib/webpack");

var base = path.join(__dirname, "statsCases");
var tests = fs.readdirSync(base);
var Stats = require("../lib/Stats");

describe("Stats", function() {
	tests.forEach(function(testName) {
		it("should print correct stats for " + testName, function(done) {
			var options = {
				entry: "./index",
				output: {
					filename: "bundle.js"
				}
			};
			if(fs.existsSync(path.join(base, testName, "webpack.config.js"))) {
				options = require(path.join(base, testName, "webpack.config.js"));
			}
			options.context = path.join(base, testName);
			var c = webpack(options);
			var files = {};
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
			var ifs = c.inputFileSystem;
			c.inputFileSystem = Object.create(ifs);
			c.inputFileSystem.readFile = function() {
				var args = Array.prototype.slice.call(arguments);
				var callback = args.pop();
				ifs.readFile.apply(ifs, args.concat([function(err, result) {
					if(err) return callback(err);
					callback(null, result.toString("utf-8").replace(/\r/g, ""));
				}]));
			};
			c.apply(new webpack.optimize.OccurrenceOrderPlugin());
			c.run(function(err, stats) {
				if(err) return done(err);
				var actual = stats.toString({
					colors: false
				});
				(typeof actual).should.be.eql("string");
				actual = actual.replace(/Version:.+\n/, "").replace(/[0-9]+(\s?ms)/g, "X$1").replace(/\r/g, "");
				var expected = fs.readFileSync(path.join(base, testName, "expected.txt"), "utf-8").replace(/\r/g, "");
				if(actual !== expected) {
					fs.writeFileSync(path.join(base, testName, "actual.txt"), actual, "utf-8");
				} else if(fs.existsSync(path.join(base, testName, "actual.txt"))) {
					fs.unlinkSync(path.join(base, testName, "actual.txt"));
				}
				actual.should.be.eql(expected);
				done();
			});
		});
	});
	describe("Error Handling", function(){
		describe("does have", function(){
			it("hasErrors", function() {
				var mockStats = new Stats({errors:['firstError'],hash:'1234'});
				mockStats.hasErrors().should.be.ok;
			});
			it("hasWarnings", function() {
				var mockStats = new Stats({warnings:['firstError'],hash:'1234'});
				mockStats.hasWarnings().should.be.ok;
			});
		});
		describe("does not have", function(){
			it("hasErrors", function() {
				var mockStats = new Stats({errors:[],hash:'1234'});
				mockStats.hasErrors().should.not.be.ok;
			});
			it("hasWarnings", function() {
				var mockStats = new Stats({warnings:[],hash:'1234'});
				mockStats.hasWarnings().should.not.be.ok;
			});
		});
		it("formatError handles string errors", function(){
			var mockStats = new Stats({
				errors:['firstError'],
				warnings:[],
				assets:[],
				chunks:[],
				modules:[],
				children:[],
				hash:'1234',
				mainTemplate:{
					getPublicPath:function(){return 'path';}
				}
			});
			var obj = mockStats.toJson();
			obj.errors[0].should.be.equal('firstError');
		});
	});

});
