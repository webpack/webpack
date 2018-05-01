"use strict";

const RawModule = require("../lib/RawModule");
const OriginalSource = require("webpack-sources").OriginalSource;
const RawSource = require("webpack-sources").RawSource;
const RequestShortener = require("../lib/RequestShortener");
const path = require("path");
const crypto = require("crypto");

describe("RawModule", () => {
	const source = "sourceStr attribute";
	const identifier = "identifierStr attribute";
	const readableIdentifier = "readableIdentifierStr attribute";
	const myRawModule = new RawModule(source, identifier, readableIdentifier);

	describe("identifier", () => {
		it("returns value for identifierStr attribute", () => {
			expect(myRawModule.identifier()).toBe("identifierStr attribute");
		});
	});

	describe("size", () => {
		it('returns value for sourceStr attribute"s length property', () => {
			const sourceStrLength = myRawModule.sourceStr.length;
			expect(myRawModule.size()).toBe(sourceStrLength);
		});
	});

	describe("readableIdentifier", () => {
		it(
			'returns result of calling provided requestShortener"s shorten method ' +
				"on readableIdentifierStr attribute",
			() => {
				const requestShortener = new RequestShortener(path.resolve());
				expect(myRawModule.readableIdentifier(requestShortener)).toBeDefined();
			}
		);
	});

	describe("needRebuild", () => {
		it("returns false", () => {
			expect(myRawModule.needRebuild()).toBe(false);
		});
	});

	describe("source", () => {
		it(
			"returns a new OriginalSource instance with sourceStr attribute and " +
				"return value of identifier() function provided as constructor arguments",
			() => {
				const originalSource = new OriginalSource(
					myRawModule.sourceStr,
					myRawModule.identifier()
				);
				myRawModule.useSourceMap = true;
				expect(myRawModule.source()).toEqual(originalSource);
			}
		);

		it(
			"returns a new RawSource instance with sourceStr attribute provided " +
				"as constructor argument if useSourceMap is falsy",
			() => {
				const rawSource = new RawSource(myRawModule.sourceStr);
				myRawModule.useSourceMap = false;
				expect(myRawModule.source()).toEqual(rawSource);
			}
		);
	});

	describe("updateHash", () => {
		it("should include sourceStr in its hash", () => {
			const hashModule = module => {
				const hash = crypto.createHash("sha256");
				module.updateHash(hash);
				return hash.digest("hex");
			};

			const hashFoo = hashModule(new RawModule('"foo"'));
			const hashBar = hashModule(new RawModule('"bar"'));
			expect(hashFoo).not.toBe(hashBar);
		});
	});
});
