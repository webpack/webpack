/*globals describe it */
"use strict";

const webpack = require("..");
const MemoryFs = require("memory-fs");

const compile = options => {
	return new Promise((resolve, reject) => {
		const compiler = webpack(options);
		compiler.outputFileSystem = new MemoryFs();
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
      "childAssets": Object {},
      "children": Object {},
      "chunks": Array [
        827,
      ],
      "name": "entryA",
    },
    "entryB": Object {
      "assets": Array [
        "entryB.js",
      ],
      "childAssets": Object {},
      "children": Object {},
      "chunks": Array [
        886,
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
      "childAssets": Object {},
      "children": Object {},
      "chunks": Array [
        787,
      ],
      "name": "chunkB",
    },
    "entryA": Object {
      "assets": Array [
        "entryA.js",
      ],
      "childAssets": Object {},
      "children": Object {},
      "chunks": Array [
        827,
      ],
      "name": "entryA",
    },
    "entryB": Object {
      "assets": Array [
        "entryB.js",
      ],
      "childAssets": Object {},
      "children": Object {},
      "chunks": Array [
        886,
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
      "chunkNames": Array [
        "chunkB",
      ],
      "chunks": Array [
        787,
      ],
      "emitted": true,
      "name": "chunkB.js",
      "size": 119,
    },
    Object {
      "chunkNames": Array [
        "entryA",
      ],
      "chunks": Array [
        827,
      ],
      "emitted": true,
      "name": "entryA.js",
      "size": 239,
    },
    Object {
      "chunkNames": Array [
        "entryB",
      ],
      "chunks": Array [
        886,
      ],
      "emitted": true,
      "name": "entryB.js",
      "size": 2017,
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
