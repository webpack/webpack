"use strict";

const deprecationTracking = require("../helpers/deprecationTracking");
const validateSchema = require("../../lib/util/validateSchema");

/** @type {import("schema-utils").Schema} */
const schema = {
	title: "My Plugin options",
	type: "object",
	additionalProperties: false,
	properties: { name: { type: "string" } }
};

/** @type {import("schema-utils").Schema} */
const untitledSchema = {
	type: "object",
	additionalProperties: false,
	properties: { name: { type: "string" } }
};

describe("validateSchema", () => {
	it("should skip the schema when the check passes", () => {
		const getSchema = jest.fn(() => schema);

		validateSchema(getSchema, { name: 42 }, undefined, () => true);

		expect(getSchema).not.toHaveBeenCalled();
	});

	it("should validate with the schema a function returns", () => {
		expect(() =>
			validateSchema(() => schema, { name: 42 }, undefined, () => false)
		).toThrow(/options\.name should be a string/);
	});

	it("should read the name and data path from the schema title", () => {
		expect(() => validateSchema(schema, { name: 42 })).toThrow(
			/^Invalid options object\. My Plugin has been initialized using an options object that does not match the API schema\.\n - options\.name should be a string\./
		);
	});

	it("should prefer a given configuration over the schema title", () => {
		expect(() =>
			validateSchema(
				schema,
				{ name: 42 },
				{ name: "Other Plugin", baseDataPath: "config" }
			)
		).toThrow(/^Invalid config object\. Other Plugin has been initialized/);
	});

	it("should fall back to the defaults without a title", () => {
		expect(() =>
			validateSchema(untitledSchema, { name: 42 }, undefined, undefined, {
				name: "Loader",
				baseDataPath: "options"
			})
		).toThrow(/^Invalid options object\. Loader has been initialized/);
	});

	it("should report a check that rejects what the schema accepts", () => {
		const tracker = deprecationTracking.start();

		validateSchema(schema, { name: "valid" }, undefined, () => false);

		expect(tracker()).toEqual([
			expect.objectContaining({
				code: "DEP_WEBPACK_PRE_COMPILED_SCHEMA_INVALID",
				message: expect.stringMatching(/^My Plugin pre-compiled schema/)
			})
		]);
	});

	it("should read the name from the schema title in compiler.validate", () => {
		const webpack = require("../..");

		const compiler = webpack({ context: __dirname });

		expect(() => compiler.validate(schema, { name: 42 })).toThrow(
			/^Invalid options object\. My Plugin has been initialized/
		);
	});
});
