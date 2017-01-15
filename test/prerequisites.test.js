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
						var output = versionCheck(providedVersion, requiredVersion);
						should(output).containEql(`Your node.js version (${providedVersion}) is not supported`);
						should(output).containEql("Node versions between >=4.7.0 and <5.0.1");
						should(output).containEql("Node versions between >=7.0.0 and <8.0.0");
					});
				});
			});
		});
	});
});
