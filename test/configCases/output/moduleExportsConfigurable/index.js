import sinon from "sinon";
import { smokeTest, es6DeepDive } from "./output.js";
import * as cjs from "./cjs.js";
import * as es6 from "./es6.js";
import * as esm from "./esm.mjs";

describe("unmocked", () => {
	it("should ignore mocking", () => {
		smokeTest().should.deepEqual(["cjs", "es6NamedExport", "esm"]);
		es6DeepDive().should.deepEqual([
			"es6DefaultExport",
			"es6NamedExport",
			"es6ExportSpecifier"
		]);
	});
});

describe("mocked", () => {
	let sandbox;

	beforeEach(() => {
		sandbox = sinon.sandbox.create();
	});

	afterEach(() => {
		sandbox.restore();
		sandbox = undefined;
	});

	it("should support mocking cjs exports", () => {
		sandbox.stub(cjs, "cjs").get(() => () => "mocked");
		smokeTest().should.deepEqual(["mocked", "es6NamedExport", "esm"]);
	});

	it("should support mocking es6 exports", () => {
		sandbox.stub(es6, "default").get(() => () => "mocked");
		sandbox.stub(es6, "es6NamedExport").get(() => () => "mocked");
		sandbox.stub(es6, "es6ExportSpecifier").get(() => () => "mocked");
		smokeTest().should.deepEqual(["cjs", "mocked", "esm"]);
		es6DeepDive().should.deepEqual(["mocked", "mocked", "mocked"]);
	});

	it("should support mocking esm exports", () => {
		sandbox.stub(esm, "esm").get(() => () => "mocked");
		smokeTest().should.deepEqual(["cjs", "es6NamedExport", "mocked"]);
	});
});
