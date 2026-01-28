"use strict";

require("./helpers/warmup-webpack");

const { Volume, createFsFromVolume } = require("memfs");

const compile = (options) =>
	new Promise((resolve, reject) => {
		const webpack = require("..");

		const compiler = webpack(options);
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		compiler.run((err, stats) => {
			if (err) {
				reject(err);
			} else {
				resolve(stats);
			}
		});
	});

describe("MultiStats", () => {
	it("should create JSON of children stats", async () => {
		const stats = await compile([
			{
				context: __dirname,
				entry: "./fixtures/a"
			},
			{
				context: __dirname,
				entry: "./fixtures/b"
			}
		]);

		const statsObject = stats.toJson();
		expect(statsObject).toEqual(
			expect.objectContaining({ children: expect.any(Array) })
		);
		expect(statsObject.children).toHaveLength(2);
	});

	it("should work with a boolean value", async () => {
		const stats = await compile([
			{
				context: __dirname,
				entry: "./fixtures/a"
			},
			{
				context: __dirname,
				entry: "./fixtures/b"
			}
		]);

		expect(stats.toJson(false)).toMatchInlineSnapshot(`
		Object {
		  "children": Array [
		    Object {
		      "name": undefined,
		    },
		    Object {
		      "name": undefined,
		    },
		  ],
		}
	`);
		expect(stats.toString(false)).toMatchInlineSnapshot('""');
	});

	it("should work with a string value", async () => {
		const stats = await compile([
			{
				context: __dirname,
				entry: "./fixtures/a"
			},
			{
				context: __dirname,
				entry: "./fixtures/b"
			}
		]);

		expect(stats.toJson("none")).toMatchInlineSnapshot(`
		Object {
		  "children": Array [
		    Object {
		      "name": undefined,
		    },
		    Object {
		      "name": undefined,
		    },
		  ],
		}
	`);
		expect(stats.toString("none")).toMatchInlineSnapshot('""');
	});

	it("should work with an object value", async () => {
		const stats = await compile([
			{
				context: __dirname,
				entry: "./fixtures/a"
			},
			{
				context: __dirname,
				entry: "./fixtures/b"
			}
		]);

		expect(
			stats.toJson({
				all: false,
				version: false,
				errorsCount: true,
				warningsCount: true
			})
		).toMatchInlineSnapshot(`
		Object {
		  "children": Array [
		    Object {
		      "errorsCount": 0,
		      "name": undefined,
		      "warningsCount": 1,
		    },
		    Object {
		      "errorsCount": 0,
		      "name": undefined,
		      "warningsCount": 1,
		    },
		  ],
		  "errorsCount": 0,
		  "warningsCount": 2,
		}
	`);
		expect(
			stats.toString({
				all: false,
				version: false,
				errorsCount: true,
				warningsCount: true
			})
		).toMatchInlineSnapshot(`
		"webpack compiled with 1 warning

		webpack compiled with 1 warning"
	`);
	});

	it("should work with a boolean value for each children", async () => {
		const stats = await compile([
			{
				context: __dirname,
				entry: "./fixtures/a"
			},
			{
				context: __dirname,
				entry: "./fixtures/b"
			}
		]);

		const statsOptions = {
			children: [false, false]
		};

		expect(stats.toJson(statsOptions)).toMatchInlineSnapshot(`
		Object {
		  "children": Array [
		    Object {
		      "name": undefined,
		    },
		    Object {
		      "name": undefined,
		    },
		  ],
		}
	`);
		expect(stats.toString(statsOptions)).toMatchInlineSnapshot('""');
	});

	it("should work with a string value for each children", async () => {
		const stats = await compile([
			{
				context: __dirname,
				entry: "./fixtures/a"
			},
			{
				context: __dirname,
				entry: "./fixtures/b"
			}
		]);

		const statsOptions = {
			children: ["none", "none"]
		};

		expect(stats.toJson(statsOptions)).toMatchInlineSnapshot(`
		Object {
		  "children": Array [
		    Object {
		      "name": undefined,
		    },
		    Object {
		      "name": undefined,
		    },
		  ],
		}
	`);
		expect(stats.toString(statsOptions)).toMatchInlineSnapshot('""');
	});

	it("should work with an object value for each children", async () => {
		const stats = await compile([
			{
				context: __dirname,
				entry: "./fixtures/a"
			},
			{
				context: __dirname,
				entry: "./fixtures/b"
			}
		]);

		const statsOptions = {
			children: [
				{
					all: false,
					publicPath: true,
					version: false,
					errorsCount: true,
					warningsCount: true
				},
				{
					all: false,
					version: false,
					errorsCount: true,
					warningsCount: true
				}
			]
		};

		expect(stats.toJson(statsOptions)).toMatchInlineSnapshot(`
		Object {
		  "children": Array [
		    Object {
		      "errorsCount": 0,
		      "name": undefined,
		      "publicPath": "auto",
		      "warningsCount": 1,
		    },
		    Object {
		      "errorsCount": 0,
		      "name": undefined,
		      "warningsCount": 1,
		    },
		  ],
		  "errorsCount": 0,
		  "warningsCount": 2,
		}
	`);
		expect(stats.toString(statsOptions)).toMatchInlineSnapshot(`
		"PublicPath: auto
		webpack compiled with 1 warning

		webpack compiled with 1 warning"
	`);
	});

	it("should work with an mixed values for each children", async () => {
		const stats = await compile([
			{
				context: __dirname,
				entry: "./fixtures/a"
			},
			{
				context: __dirname,
				entry: "./fixtures/b"
			}
		]);

		const statsOptions = {
			children: [
				false,
				{
					all: false,
					version: false,
					errorsCount: true,
					warningsCount: true
				}
			]
		};

		expect(stats.toJson(statsOptions)).toMatchInlineSnapshot(`
		Object {
		  "children": Array [
		    Object {
		      "name": undefined,
		    },
		    Object {
		      "errorsCount": 0,
		      "name": undefined,
		      "warningsCount": 1,
		    },
		  ],
		}
	`);
		expect(stats.toString(statsOptions)).toMatchInlineSnapshot(
			'"webpack compiled with 1 warning"'
		);
	});
});
