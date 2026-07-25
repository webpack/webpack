"use strict";

const generateDebugId = require("../lib/util/generateDebugId");

const UUID_V4 =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("generateDebugId", () => {
	it("should produce a UUID-v4-shaped id", () => {
		expect(generateDebugId("hello world", "file.js")).toMatch(UUID_V4);
	});

	it("should be deterministic for the same content and file", () => {
		expect(generateDebugId("hello world", "file.js")).toBe(
			generateDebugId("hello world", "file.js")
		);
	});

	it("should depend on both content and file name", () => {
		const base = generateDebugId("hello world", "file.js");
		expect(generateDebugId("other content", "file.js")).not.toBe(base);
		expect(generateDebugId("hello world", "other.js")).not.toBe(base);
	});

	it("should accept a Buffer as content", () => {
		expect(generateDebugId(Buffer.from("abc"), "x.js")).toMatch(UUID_V4);
	});
});
