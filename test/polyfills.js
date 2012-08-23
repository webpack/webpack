/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var should = require("should");
var path = require("path");
require = require("enhanced-require")(module);

describe("polyfill", function() {
	describe("loader", function() {
		describe("raw", function() {
			it("should load abc", function() {
				var abc = require("raw!./fixtures/abc.txt");
				should.exist(abc);
				abc.should.be.equal("abc");
			});
		});
		
		describe("json", function() {
			it("should load the package.json", function() {
				var packageJson = require("json!../package.json");
				should.exist(packageJson);
				packageJson.should.be.a("object");
				packageJson.should.have.ownProperty("name", "webpack");
			});
		});
		
		describe("jade", function() {
			it("should load the template", function() {
				var template = require("jade!./browsertest/resources/template.jade")
				should.exist(template);
				template.should.be.a("function");
				template({abc: "abc"}).should.be.equal("<p>abc</p>");
			});
		});
		
		describe("coffee", function() {
			it("should load a script", function() {
				var coffee = require("coffee!./browsertest/resources/script.coffee");
				should.exist(coffee);
				coffee.should.be.equal("coffee test");
			});
		});
		
		describe("css", function() {
			it("should load css and resolve imports", function() {
				var css = require("css!./browsertest/css/stylesheet.css");
				should.exist(css);
				css.should.include(".rule-direct");
				css.should.include(".rule-import1");
				css.should.include(".rule-import2");
			});
		});
		
		describe("less", function() {
			it("should compile to css and resolve imports", function() {
				var css = require("less!./browsertest/less/stylesheet.less");
				should.exist(css);
				css.should.include(".less-rule-direct");
				css.should.include(".less-rule-import1");
				css.should.include(".less-rule-import2");
			});
		});
		
		describe("cache", function() {
			it("json should be identical if required two times", function() {
				var p1 = require("json!../package.json");
				var p2 = require("json!../package.json");
				p1.should.be.equal(p2);
			});
			
			it("jade function should be identical if required two times", function() {
				var p1 = require("jade!./browsertest/resources/template.jade");
				var p2 = require("jade!./browsertest/resources/template.jade");
				p1.should.be.equal(p2);
			});
		});
	});
	
	describe("loader to extension mapping", function() {
		function testRequire(ext, testName, okName) {
			it("should map ." + ext, function() {
				var okValue = require(okName);
				var testValue = require(testName);
				should.exist(testValue);
				testValue.toString().should.eql(okValue.toString());
			});
		}
		testRequire("json", "json!../package.json", "../package.json");
		testRequire("jade", "jade!./browsertest/resources/template.jade", "./browsertest/resources/template.jade");
		testRequire("coffee", "coffee!./browsertest/resources/script.coffee", "./browsertest/resources/script.coffee");
	});
});