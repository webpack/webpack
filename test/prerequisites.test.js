/* globals describe it beforeEach */
var should = require("should");

var versionCheck = require("../prerequisites/check-version");

describe("Prerequisites", function() {

	describe("check-version", function() {
		describe("not given any arguments", function() {
			it("should use system versions and not explode", function() {
				should(() => versionCheck()).not.throw();
			});
		});

		describe("given a \"provided\" and \"required\" version as arguments", function() {
			var requiredVersion;
			beforeEach(function() {
				requiredVersion = ">=v4.7 <5.0.1 || 7";
			});
			describe("that satisfy the required version", function() {
				var providedVersions;
				beforeEach(function() {
					providedVersions = [
						"v4.7.0",
						"v4.8.0",
						"5.0.0",
						"7.3.6",
						"7.900.0",
					];
				});
				it("should not return anything", function() {
					providedVersions.forEach(function(providedVersion) {
						should(versionCheck(providedVersion, requiredVersion)).be.eql(undefined);
					});
				});
			});

			describe("that do not satisfy the required version", function() {
				var providedVersions;
				beforeEach(function() {
					providedVersions = [
						"v4.6.9",
						"v5.0.1",
						"0.0.10",
						"8.0.0"
					];
				});
				it("should not return with a complaint", function() {
					providedVersions.forEach(function(providedVersion) {
						should(versionCheck(providedVersion, requiredVersion)).be.eql(`\u001b[31mYour node.js version (${providedVersion}) is not supported by Webpack(2.2.0-rc.4).\nThis may lead to unexpected behaviour or failures!\n\nPlease see below a list of supported node version(s) for Webpack 2.2.0-rc.4:\n\t- Node versions between >=4.7.0 and <5.0.1 - or\n\t- Node versions between >=7.0.0 and <8.0.0\u001b[39m`);
					});
				});
			});
		});
	});


});
