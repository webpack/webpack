"use strict";

const { getNormalizedEntryStatic } = require("../lib/config/normalization");

describe("getNormalizedEntryStatic", () => {
	it("should return normalized entry for entry of string type", () => {
		expect(getNormalizedEntryStatic("./index.js")).toEqual({
			main: {
				import: ["./index.js"]
			}
		});
	});

	it("should return normalized entry for entries of array type", () => {
		expect(getNormalizedEntryStatic(["./index.js", "./client.js"])).toEqual({
			main: {
				import: ["./index.js", "./client.js"]
			}
		});
	});

	it("should return normalized entry for entries of object type", () => {
		expect(
			getNormalizedEntryStatic({
				main: "./index.js",
				client: "./client.js"
			})
		).toEqual({
			main: {
				import: ["./index.js"]
			},
			client: {
				import: ["./client.js"]
			}
		});
	});
});
