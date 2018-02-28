/* globals describe, it, beforeEach */
"use strict";

const should = require("should");
const SizeFormatHelpers = require("../lib/SizeFormatHelpers");

describe("SizeFormatHelpers", () => {
	describe("formatSize", () => {
		it("should handle zero size", () => {
			should(SizeFormatHelpers.formatSize(0)).be.eql("0 bytes");
		});

		it("should handle bytes", () => {
			should(SizeFormatHelpers.formatSize(1000)).be.eql("1000 bytes");
		});

		it("should handle integer kibibytes", () => {
			should(SizeFormatHelpers.formatSize(2048)).be.eql("2 KiB");
		});

		it("should handle float kibibytes", () => {
			should(SizeFormatHelpers.formatSize(2560)).be.eql("2.5 KiB");
		});

		it("should handle integer mebibytes", () => {
			should(SizeFormatHelpers.formatSize(10 * 1024 * 1024)).be.eql("10 MiB");
		});

		it("should handle float mebibytes", () => {
			should(SizeFormatHelpers.formatSize(12.5 * 1024 * 1024)).be.eql(
				"12.5 MiB"
			);
		});

		it("should handle integer gibibytes", () => {
			should(SizeFormatHelpers.formatSize(3 * 1024 * 1024 * 1024)).be.eql(
				"3 GiB"
			);
		});

		it("should handle float gibibytes", () => {
			should(SizeFormatHelpers.formatSize(1.2 * 1024 * 1024 * 1024)).be.eql(
				"1.2 GiB"
			);
		});
	});
});
