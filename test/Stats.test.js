"use strict";

require("./helpers/warmup-webpack");

const { createFsFromVolume, Volume } = require("memfs");

const compile = options => {
	return new Promise((resolve, reject) => {
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
					errorsCount: true,
					chunkGroups: true
				})
			).toMatchInlineSnapshot(`
			Object {
			  "errorsCount": 0,
			  "namedChunkGroups": Object {
			    "entryA": Object {
			      "assets": Array [
			        Object {
			          "name": "entryA.js",
			          "size": 196,
			        },
			      ],
			      "assetsSize": 196,
			      "auxiliaryAssets": undefined,
			      "auxiliaryAssetsSize": 0,
			      "childAssets": undefined,
			      "children": undefined,
			      "chunks": undefined,
			      "filteredAssets": 0,
			      "filteredAuxiliaryAssets": 0,
			      "name": "entryA",
			    },
			    "entryB": Object {
			      "assets": Array [
			        Object {
			          "name": "entryB.js",
			          "size": 196,
			        },
			      ],
			      "assetsSize": 196,
			      "auxiliaryAssets": undefined,
			      "auxiliaryAssetsSize": 0,
			      "childAssets": undefined,
			      "children": undefined,
			      "chunks": undefined,
			      "filteredAssets": 0,
			      "filteredAuxiliaryAssets": 0,
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
					errorsCount: true,
					chunkGroups: true
				})
			).toMatchInlineSnapshot(`
			Object {
			  "errorsCount": 0,
			  "namedChunkGroups": Object {
			    "chunkB": Object {
			      "assets": Array [
			        Object {
			          "name": "chunkB.js",
			          "size": 107,
			        },
			      ],
			      "assetsSize": 107,
			      "auxiliaryAssets": undefined,
			      "auxiliaryAssetsSize": 0,
			      "childAssets": undefined,
			      "children": undefined,
			      "chunks": undefined,
			      "filteredAssets": 0,
			      "filteredAuxiliaryAssets": 0,
			      "name": "chunkB",
			    },
			    "entryA": Object {
			      "assets": Array [
			        Object {
			          "name": "entryA.js",
			          "size": 196,
			        },
			      ],
			      "assetsSize": 196,
			      "auxiliaryAssets": undefined,
			      "auxiliaryAssetsSize": 0,
			      "childAssets": undefined,
			      "children": undefined,
			      "chunks": undefined,
			      "filteredAssets": 0,
			      "filteredAuxiliaryAssets": 0,
			      "name": "entryA",
			    },
			    "entryB": Object {
			      "assets": Array [
			        Object {
			          "name": "entryB.js",
			          "size": 2964,
			        },
			      ],
			      "assetsSize": 2964,
			      "auxiliaryAssets": undefined,
			      "auxiliaryAssetsSize": 0,
			      "childAssets": undefined,
			      "children": undefined,
			      "chunks": undefined,
			      "filteredAssets": 0,
			      "filteredAuxiliaryAssets": 0,
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
					errorsCount: true,
					assets: true
				})
			).toMatchInlineSnapshot(`
			Object {
			  "assets": Array [
			    Object {
			      "auxiliaryChunkIdHints": Array [],
			      "auxiliaryChunkNames": Array [],
			      "cached": false,
			      "chunkIdHints": Array [],
			      "chunkNames": Array [
			        "entryB",
			      ],
			      "comparedForEmit": false,
			      "emitted": true,
			      "filteredRelated": undefined,
			      "info": Object {
			        "javascriptModule": false,
			        "minimized": true,
			        "size": 2964,
			      },
			      "name": "entryB.js",
			      "size": 2964,
			      "type": "asset",
			    },
			    Object {
			      "auxiliaryChunkIdHints": Array [],
			      "auxiliaryChunkNames": Array [],
			      "cached": false,
			      "chunkIdHints": Array [],
			      "chunkNames": Array [
			        "entryA",
			      ],
			      "comparedForEmit": false,
			      "emitted": true,
			      "filteredRelated": undefined,
			      "info": Object {
			        "javascriptModule": false,
			        "minimized": true,
			        "size": 196,
			      },
			      "name": "entryA.js",
			      "size": 196,
			      "type": "asset",
			    },
			    Object {
			      "auxiliaryChunkIdHints": Array [],
			      "auxiliaryChunkNames": Array [],
			      "cached": false,
			      "chunkIdHints": Array [],
			      "chunkNames": Array [
			        "chunkB",
			      ],
			      "comparedForEmit": false,
			      "emitted": true,
			      "filteredRelated": undefined,
			      "info": Object {
			        "javascriptModule": false,
			        "minimized": true,
			        "size": 107,
			      },
			      "name": "chunkB.js",
			      "size": 107,
			      "type": "asset",
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
			  "errorsCount": 0,
			  "filteredAssets": undefined,
			}
		`);
		});
	});
});
