"use strict";

const {
	URIRegEx,
	buildDataURI,
	decodeDataURI,
	decodeDataURIPayload,
	languageOfFilename,
	languageOfMediaType,
	parseDataURI
} = require("../lib/util/dataURL");

describe("dataURL", () => {
	it("should decode base64 payloads", () => {
		const decoded = decodeDataURI("data:text/plain;base64,aGk=");
		expect(decoded).not.toBeNull();
		expect(/** @type {Buffer} */ (decoded).toString()).toBe("hi");
	});

	it("should percent-decode plain-text payloads as utf-8", () => {
		const decoded = decodeDataURI("data:text/plain,hello%20world");
		expect(/** @type {Buffer} */ (decoded).toString()).toBe("hello world");
	});

	it("should return the raw body when percent-decoding fails", () => {
		// a malformed percent escape survives as its literal bytes
		const decoded = decodeDataURI("data:text/plain,%E0%A4%A");
		expect(/** @type {Buffer} */ (decoded).toString()).toBe("%E0%A4%A");
	});

	it("should return null for a non-data URI", () => {
		expect(decodeDataURI("not a data uri")).toBeNull();
	});

	it("should expose a matching regular expression", () => {
		expect(URIRegEx.test("data:,plain")).toBe(true);
		expect(URIRegEx.test("http://example.com")).toBe(false);
	});
});

describe("languageOfMediaType", () => {
	it("should name the languages webpack has a notion of", () => {
		expect(languageOfMediaType("image/svg+xml")).toBe("svg");
		expect(languageOfMediaType("text/css")).toBe("css");
		expect(languageOfMediaType("text/html")).toBe("html");
		expect(languageOfMediaType("application/json")).toBe("json");
		expect(languageOfMediaType("text/javascript")).toBe("javascript");
		expect(languageOfMediaType("application/ecmascript")).toBe("javascript");
		expect(languageOfMediaType("text/x-javascript")).toBe("javascript");
	});

	it("should read the +json structured suffix off the subtype", () => {
		expect(languageOfMediaType("application/manifest+json")).toBe("json");
	});

	it("should ignore case and surrounding space", () => {
		expect(languageOfMediaType("  TEXT/CSS  ")).toBe("css");
	});

	it("should decline what names no language", () => {
		expect(languageOfMediaType("")).toBeUndefined();
		expect(languageOfMediaType("   ")).toBeUndefined();
		expect(languageOfMediaType("image/png")).toBeUndefined();
		expect(languageOfMediaType("application/octet-stream")).toBeUndefined();
	});
});

describe("languageOfFilename", () => {
	it("should read the language off the extension", () => {
		expect(languageOfFilename("/a/icon.svg")).toBe("svg");
		expect(languageOfFilename("/a/style.css")).toBe("css");
		expect(languageOfFilename("/a/page.html")).toBe("html");
		expect(languageOfFilename("/a/data.json")).toBe("json");
	});

	it("should decline an extension naming no language webpack knows", () => {
		expect(languageOfFilename("/a/note.txt")).toBeUndefined();
		expect(languageOfFilename("/a/photo.png")).toBeUndefined();
	});

	it("should decline a name with no extension, and no name at all", () => {
		expect(languageOfFilename("/a/LICENSE")).toBeUndefined();
		expect(languageOfFilename("")).toBeUndefined();
		expect(languageOfFilename(null)).toBeUndefined();
	});
});

describe("parseDataURI", () => {
	it("should split a base64 URI", () => {
		expect(parseDataURI("data:text/css;base64,YQ==")).toEqual({
			mediaType: "text/css",
			base64: true,
			payload: "YQ=="
		});
	});

	it("should split a plain URI, newlines in the payload included", () => {
		expect(parseDataURI("data:image/svg+xml,<svg>\n</svg>")).toEqual({
			mediaType: "image/svg+xml",
			base64: false,
			payload: "<svg>\n</svg>"
		});
	});

	it("should return null for what is not a data URI", () => {
		expect(parseDataURI("https://example.com/a.css")).toBeNull();
	});
});

describe("decodeDataURIPayload", () => {
	it("should read a plain payload as written", () => {
		const parsed = /** @type {NonNullable<ReturnType<typeof parseDataURI>>} */ (
			parseDataURI("data:text/css,a{color:red}")
		);
		expect(decodeDataURIPayload(parsed)).toBe("a{color:red}");
	});

	it("should decline a percent-escaped payload rather than re-escape it", () => {
		const parsed = /** @type {NonNullable<ReturnType<typeof parseDataURI>>} */ (
			parseDataURI("data:text/css,a%7Bcolor%3Ared%7D")
		);
		expect(decodeDataURIPayload(parsed)).toBeNull();
	});

	it("should decode base64 that round-trips", () => {
		const parsed = /** @type {NonNullable<ReturnType<typeof parseDataURI>>} */ (
			parseDataURI("data:text/css;base64,YXtjb2xvcjpyZWR9")
		);
		expect(decodeDataURIPayload(parsed)).toBe("a{color:red}");
	});

	it("should decline base64 that does not round-trip", () => {
		// re-encoding would write different bytes than the author did
		const parsed = /** @type {NonNullable<ReturnType<typeof parseDataURI>>} */ (
			parseDataURI("data:text/css;base64,YXtjb2xvcjpyZWR9x")
		);
		expect(decodeDataURIPayload(parsed)).toBeNull();
	});
});

describe("buildDataURI", () => {
	it("should rebuild a plain URI, escaping only what changes its meaning", () => {
		const parsed = /** @type {NonNullable<ReturnType<typeof parseDataURI>>} */ (
			parseDataURI("data:image/svg+xml,<svg/>")
		);
		expect(buildDataURI(parsed, "<svg a='100%'/>#x")).toBe(
			"data:image/svg+xml,<svg a='100%25'/>%23x"
		);
	});

	it("should rebuild a base64 URI in the form it was written", () => {
		const parsed = /** @type {NonNullable<ReturnType<typeof parseDataURI>>} */ (
			parseDataURI("data:text/css;base64,YQ==")
		);
		expect(buildDataURI(parsed, "a{color:red}")).toBe(
			"data:text/css;base64,YXtjb2xvcjpyZWR9"
		);
	});
});
