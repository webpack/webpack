"use strict";

const fs = require("graceful-fs");
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
				const arrayProperties = ["oneOf", "anyOf", "allOf"];
				const allowedProperties = [
					"definitions",
					"$ref",
					"$id",
					"title",
					"cli",
					"items",
					"properties",
					"additionalProperties",
					"type",
					"oneOf",
					"anyOf",
					"absolutePath",
					"description",
					"enum",
					"minLength",
					"pattern",
					"minimum",
					"maximum",
					"required",
					"uniqueItems",
					"minItems",
					"minProperties",
					"instanceof",
					"tsType",
					"not"
				];

				const isReference = schema => {
					return (
						"$ref" in schema ||
						("oneOf" in schema &&
							schema.oneOf.length === 1 &&
							"$ref" in schema.oneOf[0])
					);
				};

				const validateProperty = property => {
					if (isReference(property)) return;
					it("should have description set", () => {
						expect(typeof property.description).toBe("string");
						expect(property.description.length).toBeGreaterThan(1);
						expect(property.description).toMatch(/^[A-Z`]/);
						expect(property.description).toEndWith(".");
						expect(property.description).not.toEndWith("..");
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

					if ("$ref" in item) {
						it("should not have other properties next to $ref", () => {
							const otherProperties = Object.keys(item).filter(
								p => p !== "$ref"
							);
							if (otherProperties.length > 0) {
								throw new Error(
									`When using $ref other properties are not possible (${otherProperties.join(
										", "
									)})`
								);
							}
						});
					}

					if ("type" in item) {
						it("should have a single type", () => {
							expect(item.type).toBeTypeOf("string");
						});
					}

					if ("instanceof" in item) {
						it("should have tsType specified when using instanceof", () => {
							if (!("tsType" in item)) {
								throw new Error("When using instanceof, tsType is required");
							}
						});
					}

					if ("absolutePath" in item) {
						it("should have type: 'string' specified when using absolutePath", () => {
							if (item.type !== "string") {
								throw new Error(
									"When using absolutePath, type must be 'string'"
								);
							}
						});
					}

					if ("properties" in item || "additionalProperties" in item) {
						it("should have type: 'object' specified when using properties or additionalProperties", () => {
							if (item.type !== "object") {
								throw new Error(
									"When using properties or additionalProperties, type must be 'object'"
								);
							}
						});
					}

					arrayProperties.forEach(prop => {
						if (prop in item) {
							describe(prop, () => {
								it("should not double nest array properties", () => {
									for (const nestedProp of arrayProperties) {
										for (const value of item[prop])
											expect(value).not.toHaveProperty(nestedProp);
									}
								});
								if (prop === "oneOf") {
									it("should have only one item which is a $ref", () => {
										expect(item[prop].length).toBe(1);
										expect(Object.keys(item[prop][0])).toEqual(["$ref"]);
									});
								} else {
									it("should have multiple items", () => {
										expect(item[prop].length).toBeGreaterThan(1);
									});
								}
								item[prop].forEach(walker);
							});
						}
					});
					if ("items" in item) {
						describe("items", () => {
							validateProperty(item.items);
							walker(item.items);
						});
					}
					if ("definitions" in item) {
						Object.keys(item.definitions).forEach(name => {
							describe(`#${name}`, () => {
								const def = item.definitions[name];
								it("should have description set", () => {
									expect(typeof def.description).toBe("string");
									expect(def.description.length).toBeGreaterThan(1);
								});
								walker(def);
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
