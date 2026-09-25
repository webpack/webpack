"use strict";

const {
	URIRegEx,
	buildDataURI,
	decodeDataURI,
	decodeDataURIPayload,
	encodeDataURIPayload,
	languageOfFilename,
	languageOfMediaType,
	parseDataURI,
	readEmbeddedDataURI
} = require("../../lib/util/dataURL");

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
			parameters: ";base64",
			base64: true,
			payload: "YQ=="
		});
	});

	it("should split a plain URI, newlines in the payload included", () => {
		expect(parseDataURI("data:image/svg+xml,<svg>\n</svg>")).toEqual({
			mediaType: "image/svg+xml",
			parameters: "",
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

	it("should read a raw # as content", () => {
		const parsed = /** @type {NonNullable<ReturnType<typeof parseDataURI>>} */ (
			parseDataURI("data:image/svg+xml,<svg fill='#f00'/>")
		);
		expect(decodeDataURIPayload(parsed)).toBe("<svg fill='#f00'/>");
	});

	it("should decode percent-escapes the way the URL parser does", () => {
		/**
		 * @param {string} uri the URI
		 * @returns {string | null} its decoded payload
		 */
		const decode = (uri) =>
			decodeDataURIPayload(
				/** @type {NonNullable<ReturnType<typeof parseDataURI>>} */ (
					parseDataURI(uri)
				)
			);
		expect(decode("data:text/css,a%7Bcolor%3Ared%7D")).toBe("a{color:red}");
		expect(decode("data:text/css,%C3%A9")).toBe("\u00e9");
		// A `%` starting no escape is itself, as the URL parser reads it.
		expect(decode("data:text/css,a%zz%2")).toBe("a%zz%2");
		expect(decode("data:text/css;charset=utf-8,%41")).toBe("A");
	});

	it("should decline escapes naming bytes that are no UTF-8 text", () => {
		expect(
			decodeDataURIPayload(
				/** @type {NonNullable<ReturnType<typeof parseDataURI>>} */ (
					parseDataURI("data:text/css,%E9")
				)
			)
		).toBeNull();
		expect(
			decodeDataURIPayload(
				/** @type {NonNullable<ReturnType<typeof parseDataURI>>} */ (
					parseDataURI("data:text/css;charset=iso-8859-1,%41")
				)
			)
		).toBeNull();
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

	it("should keep the parameters the URI was written with", () => {
		const parsed = /** @type {NonNullable<ReturnType<typeof parseDataURI>>} */ (
			parseDataURI("data:text/css;charset=utf-8;base64,YQ==")
		);
		expect(parsed.parameters).toBe(";charset=utf-8;base64");
		expect(buildDataURI(parsed, "a{}")).toBe(
			"data:text/css;charset=utf-8;base64,YXt9"
		);
		const plain = /** @type {NonNullable<ReturnType<typeof parseDataURI>>} */ (
			parseDataURI("data:text/css;charset=utf-8,a { }")
		);
		expect(buildDataURI(plain, "a{}")).toBe("data:text/css;charset=utf-8,a{}");
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

describe("encodeDataURIPayload", () => {
	it("should escape only what the URL parser would read differently", () => {
		expect(encodeDataURIPayload("a b\"<>'{}")).toBe("a b\"<>'{}");
		expect(encodeDataURIPayload("100%#x")).toBe("100%25%23x");
		expect(encodeDataURIPayload("a\tb\nc\rd\u0000\u007f")).toBe(
			"a%09b%0Ac%0Dd%00%7F"
		);
		// Trailing spaces are stripped off a URL, leading ones inside it are not.
		expect(encodeDataURIPayload("  a  ")).toBe("  a%20%20");
	});

	it("should round-trip through the decoder a data: module reads with", () => {
		const text = "var a = '100%';\n// #x \t";
		expect(
			decodeDataURI(`data:text/javascript,${encodeDataURIPayload(text)}`)
		).toEqual(Buffer.from(text, "utf8"));
	});
});

describe("readEmbeddedDataURI", () => {
	it("should read the payload and the language its media type names", () => {
		expect(readEmbeddedDataURI('data:application/json,{"a":1}')).toEqual({
			parsed: {
				mediaType: "application/json",
				parameters: "",
				base64: false,
				payload: '{"a":1}'
			},
			type: "json",
			payload: '{"a":1}'
		});
	});

	it("should decline what offers nothing to render", () => {
		expect(readEmbeddedDataURI("https://example.com/a.json")).toBeNull();
		expect(readEmbeddedDataURI("data:image/png;base64,AAAA")).toBeNull();
		expect(readEmbeddedDataURI("data:application/json,")).toBeNull();
	});

	it("should decline a raw # a browser reads as a fragment", () => {
		expect(readEmbeddedDataURI('data:application/json,{ "b" : "#" }')).toBeNull();
		// An escaped one is content, so the payload is offered.
		expect(
			readEmbeddedDataURI('data:application/json,{ "b" : "%23" }')
		).toMatchObject({ payload: '{ "b" : "#" }' });
	});
});
