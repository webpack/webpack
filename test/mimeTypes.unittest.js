"use strict";

const mimeTypes = require("../lib/util/mimeTypes");

describe("mimeTypes", () => {
	describe("extension", () => {
		it("should return extension for mime type", () => {
			expect(mimeTypes.extension("text/html")).toBe("html");
			expect(mimeTypes.extension(" text/html")).toBe("html");
			expect(mimeTypes.extension("text/html ")).toBe("html");
		});

		it("should return undefined for unknown type", () => {
			expect(mimeTypes.extension("application/x-bogus")).toBeUndefined();
		});

		it("should return undefined for non-type string", () => {
			expect(mimeTypes.extension("bogus")).toBeUndefined();
		});

		it("should return undefined for non-strings", () => {
			expect(mimeTypes.extension(null)).toBeUndefined();
			expect(mimeTypes.extension(undefined)).toBeUndefined();
			expect(mimeTypes.extension(42)).toBeUndefined();
			expect(mimeTypes.extension({})).toBeUndefined();
			expect(mimeTypes.extension("")).toBeUndefined();
		});

		it("should return extension for mime type with parameters", () => {
			expect(mimeTypes.extension("text/html;charset=UTF-8")).toBe("html");
			expect(mimeTypes.extension("text/HTML; charset=UTF-8")).toBe("html");
			expect(mimeTypes.extension("text/html; charset=UTF-8")).toBe("html");
			expect(mimeTypes.extension("text/html; charset=UTF-8 ")).toBe("html");
			expect(mimeTypes.extension("text/html ; charset=UTF-8")).toBe("html");
		});
	});

	describe("lookup", () => {
		it('should return mime type for ".html"', () => {
			expect(mimeTypes.lookup(".html")).toBe("text/html");
		});

		it('should return mime type for ".js"', () => {
			expect(mimeTypes.lookup(".js")).toBe("text/javascript");
		});

		it('should return mime type for ".json"', () => {
			expect(mimeTypes.lookup(".json")).toBe("application/json");
		});

		it('should return mime type for ".rtf"', () => {
			expect(mimeTypes.lookup(".rtf")).toBe("application/rtf");
		});

		it('should return mime type for ".txt"', () => {
			expect(mimeTypes.lookup(".txt")).toBe("text/plain");
		});

		it('should return mime type for ".xml"', () => {
			expect(mimeTypes.lookup(".xml")).toBe("application/xml");
		});

		it('should return mime type for ".mp4"', () => {
			expect(mimeTypes.lookup(".mp4")).toBe("video/mp4");
		});

		it("should work without the leading dot", () => {
			expect(mimeTypes.lookup("html")).toBe("text/html");
			expect(mimeTypes.lookup("xml")).toBe("application/xml");
		});

		it("should be case insensitive", () => {
			expect(mimeTypes.lookup("HTML")).toBe("text/html");
			expect(mimeTypes.lookup(".Xml")).toBe("application/xml");
		});

		it("should return undefined for unknown extension", () => {
			expect(mimeTypes.lookup(".bogus")).toBeUndefined();
			expect(mimeTypes.lookup("bogus")).toBeUndefined();
		});

		it("should return undefined for non-strings", () => {
			expect(mimeTypes.lookup(null)).toBeUndefined();
			expect(mimeTypes.lookup(undefined)).toBeUndefined();
			expect(mimeTypes.lookup(42)).toBeUndefined();
			expect(mimeTypes.lookup({})).toBeUndefined();
			expect(mimeTypes.lookup("")).toBeUndefined();
		});

		it("should return mime type for file name", () => {
			expect(mimeTypes.lookup("page.html")).toBe("text/html");
		});

		it("should return mime type for relative path", () => {
			expect(mimeTypes.lookup("path/to/page.html")).toBe("text/html");
			expect(mimeTypes.lookup("path\\to\\page.html")).toBe("text/html");
		});

		it("should return mime type for absolute path", () => {
			expect(mimeTypes.lookup("/path/to/page.html")).toBe("text/html");
			expect(mimeTypes.lookup("C:\\path\\to\\page.html")).toBe("text/html");
		});

		it("should be case insensitive for path", () => {
			expect(mimeTypes.lookup("/path/to/PAGE.HTML")).toBe("text/html");
			expect(mimeTypes.lookup("C:\\path\\to\\PAGE.HTML")).toBe("text/html");
		});

		it("should return undefined for unknown extension for path", () => {
			expect(mimeTypes.lookup("/path/to/file.bogus")).toBeUndefined();
		});

		it("should return undefined for path without extension", () => {
			expect(mimeTypes.lookup("/path/to/json")).toBeUndefined();
		});

		it("should return undefined when extension-less", () => {
			expect(mimeTypes.lookup("/path/to/.json")).toBeUndefined();
		});

		it("should return mime type when there is extension", () => {
			expect(mimeTypes.lookup("/path/to/.config.json")).toBe(
				"application/json"
			);
		});

		it("should return mime type when there is extension, but no path", () => {
			expect(mimeTypes.lookup(".config.json")).toBe("application/json");
		});
	});
});
