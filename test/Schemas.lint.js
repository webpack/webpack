"use strict";

const fs = require("fs");
const path = require("path");
const glob = require("glob");
const rootDir = path.resolve(__dirname, "..");

describe("Schemas", () => {
	const schemas = glob.sync("schemas/**/*.json", {
		cwd: rootDir
	});

	schemas.forEach(filename => {
		describe(filename, () => {
			let content;
			let fileContent;
			let errorWhileParsing;

			try {
				fileContent = fs.readFileSync(path.resolve(rootDir, filename), "utf-8");
				content = JSON.parse(fileContent);
			} catch (e) {
				errorWhileParsing = e;
			}

			it("should be parse-able", () => {
				if (errorWhileParsing) throw errorWhileParsing;
			});

			if (content) {
				it("should be formated correctly", () => {
					expect(fileContent.replace(/\r\n?/g, "\n")).toBe(
						JSON.stringify(content, 0, 2) + "\n"
					);
				});

				const arrayProperties = ["oneOf", "anyOf", "allOf"];
				const allowedProperties = [
					"definitions",
					"$ref",
					"id",
					"items",
					"properties",
					"additionalProperties",
					"type",
					"oneOf",
					"anyOf",
					"allOf",
					"absolutePath",
					"description",
					"enum",
					"minLength",
					"minimum",
					"required",
					"uniqueItems",
					"minItems",
					"minProperties",
					"instanceof"
				];

				const validateProperty = property => {
					it("should have description set", () => {
						expect(typeof property.description).toBe("string");
						expect(property.description.length).toBeGreaterThan(1);
					});
				};

				const walker = item => {
					it("should only use allowed schema properties", () => {
						const otherProperties = Object.keys(item).filter(
							p => allowedProperties.indexOf(p) < 0
						);
						if (otherProperties.length > 0) {
							throw new Error(
								`The properties ${otherProperties.join(
									", "
								)} are not allowed to use`
							);
							// When allowing more properties make sure to add nice error messages for them in WebpackOptionsValidationError
						}
					});

					if (Object.keys(item).indexOf("$ref") >= 0) {
						it("should not have other properties next to $ref", () => {
							const otherProperties = Object.keys(item).filter(
								p => p !== "$ref"
							);
							if (otherProperties.length > 0) {
								throw new Error(
									`When using $ref not other properties are possible (${otherProperties.join(
										", "
									)})`
								);
							}
						});
					}

					arrayProperties.forEach(prop => {
						if (prop in item) {
							describe(prop, () => {
								item[prop].forEach(walker);
							});
						}
					});
					if ("items" in item) {
						describe("items", () => {
							if (Object.keys(item).join() !== "$ref") {
								validateProperty(item.items);
							}
							walker(item.items);
						});
					}
					if ("definitions" in item) {
						Object.keys(item.definitions).forEach(name => {
							describe(`#${name}`, () => {
								walker(item.definitions[name]);
							});
						});
					}
					if ("properties" in item) {
						it("should have additionalProperties set to some value when describing properties", () => {
							expect(item.additionalProperties).toBeDefined();
						});
						Object.keys(item.properties).forEach(name => {
							describe(`> '${name}'`, () => {
								const property = item.properties[name];
								validateProperty(property);
								walker(property);
							});
						});
					}
					if (typeof item.additionalProperties === "object") {
						describe("properties", () => {
							validateProperty(item.additionalProperties);
							walker(item.additionalProperties);
						});
					}
				};

				walker(content);
			}
		});
	});
});
