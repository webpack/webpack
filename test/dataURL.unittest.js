"use strict";

const { URIRegEx, decodeDataURI } = require("../lib/util/dataURL");

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
