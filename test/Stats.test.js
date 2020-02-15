"use strict";

const webpack = require("..");
const { createFsFromVolume, Volume } = require("memfs");

const compile = options => {
	return new Promise((resolve, reject) => {
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
};

describe("Stats", () => {
	it("should print env string in stats", async () => {
		const stats = await compile({
			context: __dirname,
			entry: "./fixtures/a"
		});
		expect(
			stats.toString({
				all: false,
				env: true,
				_env: "production"
			})
		).toBe('Environment (--env): "production"');
		expect(
			stats.toString({
				all: false,
				env: true,
				_env: {
					prod: ["foo", "bar"],
					baz: true
				}
			})
		).toBe(
			"Environment (--env): {\n" +
				'  "prod": [\n' +
				'    "foo",\n' +
				'    "bar"\n' +
				"  ],\n" +
				'  "baz": true\n' +
				"}"
		);
	});
	it("should omit all properties with all false", async () => {
		const stats = await compile({
			context: __dirname,
			entry: "./fixtures/a"
		});
		expect(
			stats.toJson({
				all: false
			})
		).toEqual({});
	});
	describe("chunkGroups", () => {
		it("should be empty when there is no additional chunks", async () => {
			const stats = await compile({
				context: __dirname,
				entry: {
					entryA: "./fixtures/a",
					entryB: "./fixtures/b"
				}
			});
			expect(
				stats.toJson({
					all: false,
					chunkGroups: true
				})
			).toMatchInlineSnapshot(`
			Object {
			  "namedChunkGroups": Object {
			    "entryA": Object {
			      "assets": Array [
			        "entryA.js",
			      ],
			      "auxiliaryAssets": Array [],
			      "childAssets": Object {},
			      "children": Object {},
			      "chunks": Array [
			        938,
			      ],
			      "name": "entryA",
			    },
			    "entryB": Object {
			      "assets": Array [
			        "entryB.js",
			      ],
			      "auxiliaryAssets": Array [],
			      "childAssets": Object {},
			      "children": Object {},
			      "chunks": Array [
			        513,
			      ],
			      "name": "entryB",
			    },
			  },
			}
		`);
		});
		it("should contain additional chunks", async () => {
			const stats = await compile({
				context: __dirname,
				entry: {
					entryA: "./fixtures/a",
					entryB: "./fixtures/chunk-b"
				}
			});
			expect(
				stats.toJson({
					all: false,
					chunkGroups: true
				})
			).toMatchInlineSnapshot(`
			Object {
			  "namedChunkGroups": Object {
			    "chunkB": Object {
			      "assets": Array [
			        "chunkB.js",
			      ],
			      "auxiliaryAssets": Array [],
			      "childAssets": Object {},
			      "children": Object {},
			      "chunks": Array [
			        336,
			      ],
			      "name": "chunkB",
			    },
			    "entryA": Object {
			      "assets": Array [
			        "entryA.js",
			      ],
			      "auxiliaryAssets": Array [],
			      "childAssets": Object {},
			      "children": Object {},
			      "chunks": Array [
			        938,
			      ],
			      "name": "entryA",
			    },
			    "entryB": Object {
			      "assets": Array [
			        "entryB.js",
			      ],
			      "auxiliaryAssets": Array [],
			      "childAssets": Object {},
			      "children": Object {},
			      "chunks": Array [
			        513,
			      ],
			      "name": "entryB",
			    },
			  },
			}
		`);
		});
		it("should contain assets", async () => {
			const stats = await compile({
				context: __dirname,
				entry: {
					entryA: "./fixtures/a",
					entryB: "./fixtures/chunk-b"
				}
			});
			expect(
				stats.toJson({
					all: false,
					assets: true
				})
			).toMatchInlineSnapshot(`
			Object {
			  "assets": Array [
			    Object {
			      "auxiliaryChunkIdHints": Array [],
			      "auxiliaryChunkNames": Array [],
			      "chunkIdHints": Array [],
			      "chunkNames": Array [
			        "chunkB",
			      ],
			      "comparedForEmit": false,
			      "emitted": true,
			      "info": Object {
			        "size": 111,
			      },
			      "name": "chunkB.js",
			      "size": 111,
			    },
			    Object {
			      "auxiliaryChunkIdHints": Array [],
			      "auxiliaryChunkNames": Array [],
			      "chunkIdHints": Array [],
			      "chunkNames": Array [
			        "entryA",
			      ],
			      "comparedForEmit": false,
			      "emitted": true,
			      "info": Object {
			        "size": 182,
			      },
			      "name": "entryA.js",
			      "size": 182,
			    },
			    Object {
			      "auxiliaryChunkIdHints": Array [],
			      "auxiliaryChunkNames": Array [],
			      "chunkIdHints": Array [],
			      "chunkNames": Array [
			        "entryB",
			      ],
			      "comparedForEmit": false,
			      "emitted": true,
			      "info": Object {
			        "size": 1865,
			      },
			      "name": "entryB.js",
			      "size": 1865,
			    },
			  ],
			  "assetsByChunkName": Object {
			    "chunkB": Array [
			      "chunkB.js",
			    ],
			    "entryA": Array [
			      "entryA.js",
			    ],
			    "entryB": Array [
			      "entryB.js",
			    ],
			  },
			  "filteredAssets": 0,
			}
		`);
		});
	});
});
