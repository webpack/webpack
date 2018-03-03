"use strict";

const RawModule = require("../lib/RawModule");
const OriginalSource = require("webpack-sources").OriginalSource;
const RawSource = require("webpack-sources").RawSource;
const RequestShortener = require("../lib/RequestShortener");
const should = require("should");
const path = require("path");
const crypto = require("crypto");

describe("RawModule", () => {
	let myRawModule;

	before(() => {
		const source = "sourceStr attribute";
		const identifier = "identifierStr attribute";
		const readableIdentifier = "readableIdentifierStr attribute";
		myRawModule = new RawModule(source, identifier, readableIdentifier);
	});

	describe("identifier", () => {
		it("returns value for identifierStr attribute", () =>
			should(myRawModule.identifier()).be.exactly("identifierStr attribute"));
	});

	describe("size", () => {
		it('returns value for sourceStr attribute"s length property', () => {
			const sourceStrLength = myRawModule.sourceStr.length;
			should(myRawModule.size()).be.exactly(sourceStrLength);
		});
	});

	describe("readableIdentifier", () => {
		it(
			'returns result of calling provided requestShortener"s shorten method ' +
				"on readableIdentifierStr attribute",
			() => {
				const requestShortener = new RequestShortener(path.resolve());
				should.exist(myRawModule.readableIdentifier(requestShortener));
			}
		);
	});

	describe("needRebuild", () => {
		it("returns false", () => should(myRawModule.needRebuild()).be.false());
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
				myRawModule.source().should.match(originalSource);
			}
		);

		it(
			"returns a new RawSource instance with sourceStr attribute provided " +
				"as constructor argument if useSourceMap is falsy",
			() => {
				const rawSource = new RawSource(myRawModule.sourceStr);
				myRawModule.useSourceMap = false;
				myRawModule.source().should.match(rawSource);
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
			hashFoo.should.not.equal(hashBar);
		});
	});
});
