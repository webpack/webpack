/* globals describe, it, beforeEach */
"use strict";

const SizeFormatHelpers = require("../lib/SizeFormatHelpers");

describe("SizeFormatHelpers", () => {
	describe("formatSize", () => {
		it("should handle zero size", () => {
			expect(SizeFormatHelpers.formatSize(0)).toBe("0 bytes");
		});

		it("should handle bytes", () => {
			expect(SizeFormatHelpers.formatSize(1000)).toBe("1000 bytes");
		});

		it("should handle integer kibibytes", () => {
			expect(SizeFormatHelpers.formatSize(2048)).toBe("2 KiB");
		});

		it("should handle float kibibytes", () => {
			expect(SizeFormatHelpers.formatSize(2560)).toBe("2.5 KiB");
		});

		it("should handle integer mebibytes", () => {
			expect(SizeFormatHelpers.formatSize(10 * 1024 * 1024)).toBe("10 MiB");
		});

		it("should handle float mebibytes", () => {
			expect(SizeFormatHelpers.formatSize(12.5 * 1024 * 1024)).toBe("12.5 MiB");
		});

		it("should handle integer gibibytes", () => {
			expect(SizeFormatHelpers.formatSize(3 * 1024 * 1024 * 1024)).toBe(
				"3 GiB"
			);
		});

		it("should handle float gibibytes", () => {
			expect(SizeFormatHelpers.formatSize(1.2 * 1024 * 1024 * 1024)).toBe(
				"1.2 GiB"
			);
		});

		it("should handle undefined/NaN", () => {
			expect(SizeFormatHelpers.formatSize(undefined)).toBe("unknown size");
			expect(SizeFormatHelpers.formatSize(NaN)).toBe("unknown size");
		});
	});
});
