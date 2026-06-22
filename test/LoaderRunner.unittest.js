"use strict";

const fs = require("fs");
const path = require("path");
const { getContext, runLoaders } = require("../lib/loaders/LoaderRunner");

const fixtures = path.resolve(__dirname, "fixtures", "loader-runner");

/**
 * Asserts `err` is an Error. `instanceof Error` is unreliable across the jest
 * vm-module realm boundary (`--experimental-vm-modules`), so check the
 * realm-independent internal class tag instead.
 * @param {unknown} err thrown value
 * @returns {asserts err is NodeJS.ErrnoException} err is an Error
 */
function expectError(err) {
	expect(Object.prototype.toString.call(err)).toBe("[object Error]");
}

describe("runLoaders", () => {
	it("should process only a resource", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "resource.bin")
			},
			(err, result) => {
				if (err) return done(err);
				expect(result.result).toEqual([Buffer.from("resource", "utf8")]);
				expect(result.cacheable).toBe(true);
				expect(result.fileDependencies).toEqual([
					path.resolve(fixtures, "resource.bin")
				]);
				expect(result.contextDependencies).toEqual([]);
				done();
			}
		);
	});

	it("should process a simple sync loader", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "resource.bin"),
				loaders: [path.resolve(fixtures, "simple-loader.js")]
			},
			(err, result) => {
				if (err) return done(err);
				expect(result.result).toEqual(["resource-simple"]);
				expect(result.cacheable).toBe(true);
				expect(result.fileDependencies).toEqual([
					path.resolve(fixtures, "resource.bin")
				]);
				expect(result.contextDependencies).toEqual([]);
				done();
			}
		);
	});

	it("should process a simple async loader", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "resource.bin"),
				loaders: [path.resolve(fixtures, "simple-async-loader.js")]
			},
			(err, result) => {
				if (err) return done(err);
				expect(result.result).toEqual(["resource-async-simple"]);
				expect(result.cacheable).toBe(true);
				expect(result.fileDependencies).toEqual([
					path.resolve(fixtures, "resource.bin")
				]);
				expect(result.contextDependencies).toEqual([]);
				done();
			}
		);
	});

	it("should process a simple promise loader", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "resource.bin"),
				loaders: [path.resolve(fixtures, "simple-promise-loader.js")]
			},
			(err, result) => {
				if (err) return done(err);
				expect(result.result).toEqual(["resource-promise-simple"]);
				expect(result.cacheable).toBe(true);
				expect(result.fileDependencies).toEqual([
					path.resolve(fixtures, "resource.bin")
				]);
				expect(result.contextDependencies).toEqual([]);
				done();
			}
		);
	});

	it("should process multiple simple loaders", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "resource.bin"),
				loaders: [
					path.resolve(fixtures, "simple-async-loader.js"),
					path.resolve(fixtures, "simple-loader.js"),
					path.resolve(fixtures, "simple-async-loader.js"),
					path.resolve(fixtures, "simple-async-loader.js"),
					path.resolve(fixtures, "simple-loader.js")
				]
			},
			(err, result) => {
				if (err) return done(err);
				expect(result.result).toEqual([
					"resource-simple-async-simple-async-simple-simple-async-simple"
				]);
				expect(result.cacheable).toBe(true);
				expect(result.fileDependencies).toEqual([
					path.resolve(fixtures, "resource.bin")
				]);
				expect(result.contextDependencies).toEqual([]);
				done();
			}
		);
	});

	it("should process pitching loaders", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "resource.bin"),
				loaders: [
					path.resolve(fixtures, "simple-loader.js"),
					path.resolve(fixtures, "pitching-loader.js"),
					path.resolve(fixtures, "simple-async-loader.js")
				]
			},
			(err, result) => {
				if (err) return done(err);
				expect(result.result).toEqual([
					`${path.resolve(fixtures, "simple-async-loader.js")}!${path.resolve(
						fixtures,
						"resource.bin"
					)}:${path.resolve(fixtures, "simple-loader.js")}-simple`
				]);
				expect(result.cacheable).toBe(true);
				expect(result.fileDependencies).toEqual([]);
				expect(result.contextDependencies).toEqual([]);
				done();
			}
		);
	});

	it("should interpret explicit `undefined` values from async 'pitch' loaders", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "resource.bin"),
				loaders: [
					path.resolve(fixtures, "simple-loader.js"),
					path.resolve(fixtures, "pitch-async-undef-loader.js"),
					path.resolve(fixtures, "pitch-promise-undef-loader.js")
				]
			},
			(err, result) => {
				if (err) return done(err);
				expect(result.result).toEqual(["resource-simple"]);
				expect(result.cacheable).toBe(true);
				expect(result.fileDependencies).toEqual([
					path.resolve(fixtures, "resource.bin")
				]);
				expect(result.contextDependencies).toEqual([]);
				done();
			}
		);
	});

	it("should interrupt pitching when async loader completes with any additional non-undefined values", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "resource.bin"),
				loaders: [
					path.resolve(fixtures, "simple-loader.js"),
					path.resolve(fixtures, "pitch-async-undef-some-loader.js")
				]
			},
			(err, result) => {
				if (err) return done(err);
				expect(result.result).toEqual(["undefined-simple"]);
				expect(result.cacheable).toBe(true);
				expect(result.fileDependencies).toEqual([]);
				expect(result.contextDependencies).toEqual([]);
				done();
			}
		);
	});

	it("should be possible to add dependencies", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "resource.bin"),
				loaders: [path.resolve(fixtures, "dependencies-loader.js")]
			},
			(err, result) => {
				if (err) return done(err);
				expect(result.cacheable).toBe(true);
				expect(result.fileDependencies).toEqual(["a", "b"]);
				expect(result.contextDependencies).toEqual(["c"]);
				expect(result.missingDependencies).toEqual(["d"]);
				expect(result.result).toEqual([
					`resource\n${JSON.stringify(["a", "b"])}${JSON.stringify([
						"c"
					])}${JSON.stringify(["d"])}`
				]);
				done();
			}
		);
	});

	it("should have to correct keys in context", (done) => {
		runLoaders(
			{
				resource: `${path.resolve(fixtures, "resource.bin")}?query#frag`,
				loaders: [
					`${path.resolve(fixtures, "keys-loader.js")}?loader-query`,
					path.resolve(fixtures, "simple-loader.js")
				]
			},
			(err, result) => {
				if (err) return done(err);
				try {
					expect(JSON.parse(result.result[0])).toEqual({
						context: fixtures,
						resource: `${path.resolve(fixtures, "resource.bin")}?query#frag`,
						resourcePath: path.resolve(fixtures, "resource.bin"),
						resourceQuery: "?query",
						resourceFragment: "#frag",
						loaderIndex: 0,
						query: "?loader-query",
						currentRequest: `${path.resolve(
							fixtures,
							"keys-loader.js"
						)}?loader-query!${path.resolve(
							fixtures,
							"simple-loader.js"
						)}!${path.resolve(fixtures, "resource.bin")}?query#frag`,
						remainingRequest: `${path.resolve(
							fixtures,
							"simple-loader.js"
						)}!${path.resolve(fixtures, "resource.bin")}?query#frag`,
						previousRequest: "",
						request: `${path.resolve(
							fixtures,
							"keys-loader.js"
						)}?loader-query!${path.resolve(
							fixtures,
							"simple-loader.js"
						)}!${path.resolve(fixtures, "resource.bin")}?query#frag`,
						data: null,
						loaders: [
							{
								request: `${path.resolve(fixtures, "keys-loader.js")}?loader-query`,
								path: path.resolve(fixtures, "keys-loader.js"),
								query: "?loader-query",
								fragment: "",
								data: null,
								pitchExecuted: true,
								normalExecuted: true
							},
							{
								request: path.resolve(fixtures, "simple-loader.js"),
								path: path.resolve(fixtures, "simple-loader.js"),
								query: "",
								fragment: "",
								data: null,
								pitchExecuted: true,
								normalExecuted: true
							}
						]
					});
				} catch (err_) {
					return done(err_);
				}
				done();
			}
		);
	});

	it("should have to correct keys in context (with options)", (done) => {
		runLoaders(
			{
				resource: `${path.resolve(fixtures, "resource.bin")}?query`,
				loaders: [
					{
						loader: path.resolve(fixtures, "keys-loader.js"),
						options: {
							ident: "ident",
							loader: "query"
						}
					}
				]
			},
			(err, result) => {
				if (err) return done(err);
				try {
					expect(JSON.parse(result.result[0])).toEqual({
						context: fixtures,
						resource: `${path.resolve(fixtures, "resource.bin")}?query`,
						resourcePath: path.resolve(fixtures, "resource.bin"),
						resourceQuery: "?query",
						resourceFragment: "",
						loaderIndex: 0,
						query: {
							ident: "ident",
							loader: "query"
						},
						currentRequest: `${path.resolve(
							fixtures,
							"keys-loader.js"
						)}??ident!${path.resolve(fixtures, "resource.bin")}?query`,
						remainingRequest: `${path.resolve(fixtures, "resource.bin")}?query`,
						previousRequest: "",
						request: `${path.resolve(
							fixtures,
							"keys-loader.js"
						)}??ident!${path.resolve(fixtures, "resource.bin")}?query`,
						data: null,
						loaders: [
							{
								request: `${path.resolve(fixtures, "keys-loader.js")}??ident`,
								path: path.resolve(fixtures, "keys-loader.js"),
								query: "??ident",
								fragment: "",
								options: {
									ident: "ident",
									loader: "query"
								},
								data: null,
								pitchExecuted: true,
								normalExecuted: true
							}
						]
					});
				} catch (err_) {
					return done(err_);
				}
				done();
			}
		);
	});

	it("should process raw loaders", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "bom.bin"),
				loaders: [path.resolve(fixtures, "raw-loader.js")]
			},
			(err, result) => {
				if (err) return done(err);
				expect(result.result[0].toString("utf8")).toBe("efbbbf62c3b66d﻿böm");
				done();
			}
		);
	});

	it("should process omit BOM on string conversion", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "bom.bin"),
				loaders: [
					path.resolve(fixtures, "raw-loader.js"),
					path.resolve(fixtures, "simple-loader.js")
				]
			},
			(err, result) => {
				if (err) return done(err);
				expect(result.result[0].toString("utf8")).toBe(
					"62c3b66d2d73696d706c65böm-simple"
				);
				done();
			}
		);
	});

	it("should have to correct keys in context without resource", (done) => {
		runLoaders(
			{
				loaders: [
					path.resolve(fixtures, "identity-loader.js"),
					path.resolve(fixtures, "keys-loader.js")
				]
			},
			(err, result) => {
				if (err) return done(err);
				try {
					expect(JSON.parse(result.result[0])).toEqual({
						context: null,
						resource: "",
						resourcePath: "",
						resourceQuery: "",
						resourceFragment: "",
						loaderIndex: 1,
						query: "",
						currentRequest: `${path.resolve(fixtures, "keys-loader.js")}!`,
						remainingRequest: "",
						previousRequest: path.resolve(fixtures, "identity-loader.js"),
						request: `${path.resolve(
							fixtures,
							"identity-loader.js"
						)}!${path.resolve(fixtures, "keys-loader.js")}!`,
						data: null,
						loaders: [
							{
								request: path.resolve(fixtures, "identity-loader.js"),
								path: path.resolve(fixtures, "identity-loader.js"),
								query: "",
								fragment: "",
								data: {
									identity: true
								},
								pitchExecuted: true,
								normalExecuted: false
							},
							{
								request: path.resolve(fixtures, "keys-loader.js"),
								path: path.resolve(fixtures, "keys-loader.js"),
								query: "",
								fragment: "",
								data: null,
								pitchExecuted: true,
								normalExecuted: true
							}
						]
					});
				} catch (err_) {
					return done(err_);
				}
				done();
			}
		);
	});

	it("should have to correct keys in context with only resource query", (done) => {
		runLoaders(
			{
				resource: "?query",
				loaders: [
					{
						loader: path.resolve(fixtures, "keys-loader.js"),
						options: {
							ok: true
						},
						ident: "my-ident"
					}
				]
			},
			(err, result) => {
				if (err) return done(err);
				try {
					expect(JSON.parse(result.result[0])).toEqual({
						context: null,
						resource: "?query",
						resourcePath: "",
						resourceQuery: "?query",
						resourceFragment: "",
						loaderIndex: 0,
						query: {
							ok: true
						},
						currentRequest: `${path.resolve(fixtures, "keys-loader.js")}??my-ident!?query`,
						remainingRequest: "?query",
						previousRequest: "",
						request:
							`${path.resolve(fixtures, "keys-loader.js")}??my-ident!` +
							"?query",
						data: null,
						loaders: [
							{
								request: `${path.resolve(fixtures, "keys-loader.js")}??my-ident`,
								path: path.resolve(fixtures, "keys-loader.js"),
								query: "??my-ident",
								fragment: "",
								ident: "my-ident",
								options: {
									ok: true
								},
								data: null,
								pitchExecuted: true,
								normalExecuted: true
							}
						]
					});
				} catch (err_) {
					return done(err_);
				}
				done();
			}
		);
	});

	it("should have to correct keys in context with only resource fragment", (done) => {
		runLoaders(
			{
				resource: "#fragment",
				loaders: [
					{
						loader: path.resolve(fixtures, "keys-loader.js"),
						options: {
							ok: true
						},
						ident: "my-ident"
					}
				]
			},
			(err, result) => {
				if (err) return done(err);
				try {
					expect(JSON.parse(result.result[0])).toEqual({
						context: null,
						resource: "#fragment",
						resourcePath: "",
						resourceQuery: "",
						resourceFragment: "#fragment",
						loaderIndex: 0,
						query: {
							ok: true
						},
						currentRequest: `${path.resolve(fixtures, "keys-loader.js")}??my-ident!#fragment`,
						remainingRequest: "#fragment",
						previousRequest: "",
						request:
							`${path.resolve(fixtures, "keys-loader.js")}??my-ident!` +
							"#fragment",
						data: null,
						loaders: [
							{
								request: `${path.resolve(fixtures, "keys-loader.js")}??my-ident`,
								path: path.resolve(fixtures, "keys-loader.js"),
								query: "??my-ident",
								fragment: "",
								ident: "my-ident",
								options: {
									ok: true
								},
								data: null,
								pitchExecuted: true,
								normalExecuted: true
							}
						]
					});
				} catch (err_) {
					return done(err_);
				}
				done();
			}
		);
	});

	it("should allow to change loader order and execution", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "bom.bin"),
				loaders: [
					path.resolve(fixtures, "change-stuff-loader.js"),
					path.resolve(fixtures, "simple-loader.js"),
					path.resolve(fixtures, "simple-loader.js")
				]
			},
			(err, result) => {
				if (err) return done(err);
				expect(result.result).toEqual(["resource"]);
				done();
			}
		);
	});

	it("should return dependencies when resource not found", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "missing.txt"),
				loaders: [path.resolve(fixtures, "pitch-dependencies-loader.js")]
			},
			(err, result) => {
				expectError(err);
				expect(err.message).toMatch(/ENOENT/i);
				expect(result.fileDependencies).toEqual([
					`remainingRequest:${path.resolve(fixtures, "missing.txt")}`,
					path.resolve(fixtures, "missing.txt")
				]);
				done();
			}
		);
	});

	it("should not return dependencies when loader not found", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "resource.bin"),
				loaders: [path.resolve(fixtures, "does-not-exist-loader.js")]
			},
			(err, result) => {
				expectError(err);
				expect(err.code).toBe("MODULE_NOT_FOUND");
				expect(err.message).toMatch(/does-not-exist-loader\.js'/i);
				expect(result).toEqual({
					cacheable: false,
					fileDependencies: [],
					contextDependencies: [],
					missingDependencies: []
				});
				done();
			}
		);
	});

	it("should not return dependencies when loader is empty object", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "resource.bin"),
				loaders: [path.resolve(fixtures, "module-exports-object-loader.js")]
			},
			(err, result) => {
				expectError(err);
				expect(err.message).toMatch(
					/module-exports-object-loader.js' is not a loader \(must have normal or pitch function\)$/
				);
				expect(result).toEqual({
					cacheable: false,
					fileDependencies: [],
					contextDependencies: [],
					missingDependencies: []
				});
				done();
			}
		);
	});

	it("should not return dependencies when loader is otherwise invalid (string)", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "resource.bin"),
				loaders: [path.resolve(fixtures, "module-exports-string-loader.js")]
			},
			(err, result) => {
				expectError(err);
				expect(err.message).toMatch(
					/module-exports-string-loader.js' is not a loader \(export function or es6 module\)$/
				);
				expect(result).toEqual({
					cacheable: false,
					fileDependencies: [],
					contextDependencies: [],
					missingDependencies: []
				});
				done();
			}
		);
	});

	it("should return dependencies when loader throws error", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "resource.bin"),
				loaders: [path.resolve(fixtures, "throws-error-loader.js")]
			},
			(err, result) => {
				expectError(err);
				expect(err.message).toMatch(/^resource$/i);
				expect(result.fileDependencies).toEqual([
					path.resolve(fixtures, "resource.bin")
				]);
				done();
			}
		);
	});

	it("should return dependencies when loader rejects promise", (done) => {
		let once = true;
		runLoaders(
			{
				resource: path.resolve(fixtures, "resource.bin"),
				loaders: [path.resolve(fixtures, "promise-error-loader.js")]
			},
			(err, result) => {
				if (!once) return done(new Error("should not be called twice"));
				once = false;
				expectError(err);
				expect(err.message).toMatch(/^resource$/i);
				expect(result.fileDependencies).toEqual([
					path.resolve(fixtures, "resource.bin")
				]);
				done();
			}
		);
	});

	it("should use an ident if passed", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "resource.bin"),
				loaders: [
					{
						loader: path.resolve(fixtures, "pitching-loader.js")
					},
					{
						loader: path.resolve(fixtures, "simple-loader.js"),
						options: {
							f() {}
						},
						ident: "my-ident"
					}
				]
			},
			(err, result) => {
				if (err) return done(err);
				expect(result.result).toEqual([
					`${path.resolve(
						fixtures,
						"simple-loader.js"
					)}??my-ident!${path.resolve(fixtures, "resource.bin")}:`
				]);
				done();
			}
		);
	});

	it("should load a loader using System.import and process", (done) => {
		/** @type {EXPECTED_ANY} */
		(global).System = {
			import(/** @type {string} */ moduleId) {
				return Promise.resolve(require(moduleId));
			}
		};
		runLoaders(
			{
				resource: path.resolve(fixtures, "resource.bin"),
				loaders: [path.resolve(fixtures, "simple-loader.js")]
			},
			(err, result) => {
				if (err) return done(err);
				expect(result.result).toEqual(["resource-simple"]);
				expect(result.cacheable).toBe(true);
				expect(result.fileDependencies).toEqual([
					path.resolve(fixtures, "resource.bin")
				]);
				expect(result.contextDependencies).toEqual([]);
				done();
			}
		);
		delete (/** @type {EXPECTED_ANY} */ (global).System);
	});

	if (Number(process.versions.modules) >= 83) {
		it("should load a loader using import()", (done) => {
			runLoaders(
				{
					resource: path.resolve(fixtures, "resource.bin"),
					loaders: [
						{
							loader: path.resolve(fixtures, "esm-loader.mjs"),
							type: "module"
						}
					]
				},
				(err, result) => {
					if (err) return done(err);
					expect(result.result).toEqual(["resource-esm"]);
					expect(result.cacheable).toBe(true);
					expect(result.fileDependencies).toEqual([
						path.resolve(fixtures, "resource.bin")
					]);
					expect(result.contextDependencies).toEqual([]);
					done();
				}
			);
		});
	}

	// `require()` of an ESM file only works where the runtime supports it:
	// native Node >=22.12, and under jest only on Node >=24.9 (sync vm module
	// APIs), and not under Deno. Feature-detect rather than sniff the version.
	let canRequireEsm = false;
	try {
		require(path.resolve(fixtures, "esm-loader.mjs"));
		canRequireEsm = true;
	} catch (_err) {
		// require(esm) is not supported in this runtime
	}
	if (canRequireEsm) {
		it("should load an esm loader using require()", (done) => {
			runLoaders(
				{
					resource: path.resolve(fixtures, "resource.bin"),
					loaders: [path.resolve(fixtures, "esm-loader.mjs")]
				},
				(err, result) => {
					if (err) return done(err);
					expect(result.result).toEqual(["resource-esm"]);
					expect(result.cacheable).toBe(true);
					expect(result.fileDependencies).toEqual([
						path.resolve(fixtures, "resource.bin")
					]);
					expect(result.contextDependencies).toEqual([]);
					done();
				}
			);
		});
	}

	if (Number(process.versions.modules) >= 83) {
		it("should load a commonjs loader using import()", (done) => {
			runLoaders(
				{
					resource: path.resolve(fixtures, "resource.bin"),
					loaders: [
						{
							loader: path.resolve(fixtures, "simple-loader.js"),
							type: "module"
						}
					]
				},
				(err, result) => {
					if (err) return done(err);
					expect(result.result).toEqual(["resource-simple"]);
					expect(result.cacheable).toBe(true);
					expect(result.fileDependencies).toEqual([
						path.resolve(fixtures, "resource.bin")
					]);
					expect(result.contextDependencies).toEqual([]);
					done();
				}
			);
		});

		it("should process an esm pitching loader using import()", (done) => {
			runLoaders(
				{
					resource: path.resolve(fixtures, "resource.bin"),
					loaders: [
						path.resolve(fixtures, "simple-loader.js"),
						{
							loader: path.resolve(fixtures, "esm-pitching-loader.mjs"),
							type: "module"
						},
						path.resolve(fixtures, "simple-async-loader.js")
					]
				},
				(err, result) => {
					if (err) return done(err);
					expect(result.result).toEqual([
						`${path.resolve(fixtures, "simple-async-loader.js")}!${path.resolve(
							fixtures,
							"resource.bin"
						)}:${path.resolve(fixtures, "simple-loader.js")}-simple`
					]);
					expect(result.cacheable).toBe(true);
					expect(result.fileDependencies).toEqual([]);
					expect(result.contextDependencies).toEqual([]);
					done();
				}
			);
		});

		it("should process an esm raw loader using import()", (done) => {
			runLoaders(
				{
					resource: path.resolve(fixtures, "bom.bin"),
					loaders: [
						{
							loader: path.resolve(fixtures, "esm-raw-loader.mjs"),
							type: "module"
						}
					]
				},
				(err, result) => {
					if (err) return done(err);
					expect(result.result[0].toString("utf8")).toBe("efbbbf62c3b66d﻿böm");
					done();
				}
			);
		});

		it("should not return dependencies when an esm loader is not found", (done) => {
			runLoaders(
				{
					resource: path.resolve(fixtures, "resource.bin"),
					loaders: [
						{
							loader: path.resolve(fixtures, "does-not-exist-loader.mjs"),
							type: "module"
						}
					]
				},
				(err, result) => {
					expectError(err);
					expect(result).toEqual({
						cacheable: false,
						fileDependencies: [],
						contextDependencies: [],
						missingDependencies: []
					});
					done();
				}
			);
		});

		it("should not return dependencies when an esm loader has an invalid default export", (done) => {
			runLoaders(
				{
					resource: path.resolve(fixtures, "resource.bin"),
					loaders: [
						{
							loader: path.resolve(fixtures, "esm-invalid-loader.mjs"),
							type: "module"
						}
					]
				},
				(err, result) => {
					expectError(err);
					expect(err.message).toMatch(
						/esm-invalid-loader\.mjs' is not a loader \(must have normal or pitch function\)$/
					);
					expect(result).toEqual({
						cacheable: false,
						fileDependencies: [],
						contextDependencies: [],
						missingDependencies: []
					});
					done();
				}
			);
		});
	}

	it("should support escaping in resource", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "res\0#ource.bin")
			},
			(err, result) => {
				if (err) return done(err);
				expect(result.result).toEqual([Buffer.from("resource", "utf8")]);
				expect(result.cacheable).toBe(true);
				expect(result.fileDependencies).toEqual([
					path.resolve(fixtures, "res#ource.bin")
				]);
				expect(result.contextDependencies).toEqual([]);
				done();
			}
		);
	});

	it("should have to correct keys in context when using escaping", (done) => {
		runLoaders(
			{
				resource: `${path.resolve(fixtures, "res\0#ource.bin")}?query\0#frag`,
				loaders: [`${path.resolve(fixtures, "keys-loader.js")}?loader\0#query`]
			},
			(err, result) => {
				if (err) return done(err);
				try {
					expect(JSON.parse(result.result[0])).toEqual({
						context: fixtures,
						resource: `${path.resolve(fixtures, "res\0#ource.bin")}?query\0#frag`,
						resourcePath: path.resolve(fixtures, "res#ource.bin"),
						resourceQuery: "?query#frag",
						resourceFragment: "",
						loaderIndex: 0,
						query: "?loader#query",
						currentRequest: `${path.resolve(
							fixtures,
							"keys-loader.js"
						)}?loader\0#query!${path.resolve(
							fixtures,
							"res\0#ource.bin"
						)}?query\0#frag`,
						remainingRequest: `${path.resolve(fixtures, "res\0#ource.bin")}?query\0#frag`,
						previousRequest: "",
						request: `${path.resolve(
							fixtures,
							"keys-loader.js"
						)}?loader\0#query!${path.resolve(
							fixtures,
							"res\0#ource.bin"
						)}?query\0#frag`,
						data: null,
						loaders: [
							{
								request: `${path.resolve(fixtures, "keys-loader.js")}?loader\0#query`,
								path: path.resolve(fixtures, "keys-loader.js"),
								query: "?loader#query",
								fragment: "",
								data: null,
								pitchExecuted: true,
								normalExecuted: true
							}
						]
					});
				} catch (err_) {
					return done(err_);
				}
				done();
			}
		);
	});

	it("should have to correct keys in context with empty resource", (done) => {
		runLoaders(
			{
				resource: "",
				loaders: [
					`${path.resolve(fixtures, "keys-loader.js")}?loader-query`,
					path.resolve(fixtures, "simple-loader.js")
				]
			},
			(err, result) => {
				if (err) return done(err);
				try {
					expect(JSON.parse(result.result[0])).toEqual({
						context: null,
						resource: "",
						resourcePath: "",
						resourceQuery: "",
						resourceFragment: "",
						loaderIndex: 0,
						query: "?loader-query",
						currentRequest: `${path.resolve(
							fixtures,
							"keys-loader.js"
						)}?loader-query!${path.resolve(fixtures, "simple-loader.js")}!`,
						remainingRequest: `${path.resolve(fixtures, "simple-loader.js")}!`,
						previousRequest: "",
						request: `${path.resolve(
							fixtures,
							"keys-loader.js"
						)}?loader-query!${path.resolve(fixtures, "simple-loader.js")}!`,
						data: null,
						loaders: [
							{
								request: `${path.resolve(fixtures, "keys-loader.js")}?loader-query`,
								path: path.resolve(fixtures, "keys-loader.js"),
								query: "?loader-query",
								fragment: "",
								data: null,
								pitchExecuted: true,
								normalExecuted: true
							},
							{
								request: path.resolve(fixtures, "simple-loader.js"),
								path: path.resolve(fixtures, "simple-loader.js"),
								query: "",
								fragment: "",
								data: null,
								pitchExecuted: true,
								normalExecuted: true
							}
						]
					});
				} catch (err_) {
					return done(err_);
				}
				done();
			}
		);
	});

	it("should have to correct keys in context with empty resource and set a new resource", (done) => {
		runLoaders(
			{
				resource: "",
				loaders: [
					`${path.resolve(fixtures, "keys-loader.js")}?loader-query`,
					path.resolve(fixtures, "set-resource-loader.js")
				]
			},
			(err, result) => {
				if (err) return done(err);
				try {
					expect(JSON.parse(result.result[0])).toEqual({
						context: null,
						resource: `${path.resolve(fixtures, "resource.bin")}?foo=bar#hash`,
						resourcePath: path.resolve(fixtures, "resource.bin"),
						resourceQuery: "?foo=bar",
						resourceFragment: "#hash",
						loaderIndex: 0,
						query: "?loader-query",
						currentRequest: `${path.resolve(
							fixtures,
							"keys-loader.js"
						)}?loader-query!${path.resolve(fixtures, "set-resource-loader.js")}!${path.resolve(fixtures, "resource.bin")}?foo=bar#hash`,
						remainingRequest: `${path.resolve(fixtures, "set-resource-loader.js")}!${path.resolve(fixtures, "resource.bin")}?foo=bar#hash`,
						previousRequest: "",
						request: `${path.resolve(
							fixtures,
							"keys-loader.js"
						)}?loader-query!${path.resolve(fixtures, "set-resource-loader.js")}!${path.resolve(fixtures, "resource.bin")}?foo=bar#hash`,
						data: null,
						loaders: [
							{
								request: `${path.resolve(fixtures, "keys-loader.js")}?loader-query`,
								path: path.resolve(fixtures, "keys-loader.js"),
								query: "?loader-query",
								fragment: "",
								data: null,
								pitchExecuted: true,
								normalExecuted: true
							},
							{
								request: path.resolve(fixtures, "set-resource-loader.js"),
								path: path.resolve(fixtures, "set-resource-loader.js"),
								query: "",
								fragment: "",
								data: null,
								pitchExecuted: true,
								normalExecuted: true
							}
						]
					});
				} catch (err_) {
					return done(err_);
				}
				done();
			}
		);
	});

	it("should have to correct keys in context with resource and set a new resource", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "resource.bin"),
				loaders: [
					`${path.resolve(fixtures, "keys-loader.js")}?loader-query`,
					path.resolve(fixtures, "set-empty-resource-loader.js")
				]
			},
			(err, result) => {
				if (err) return done(err);
				try {
					expect(JSON.parse(result.result[0])).toEqual({
						context: fixtures,
						resource: "",
						resourcePath: "",
						resourceQuery: "",
						resourceFragment: "",
						loaderIndex: 0,
						query: "?loader-query",
						currentRequest: `${path.resolve(
							fixtures,
							"keys-loader.js"
						)}?loader-query!${path.resolve(fixtures, "set-empty-resource-loader.js")}!`,
						remainingRequest: `${path.resolve(fixtures, "set-empty-resource-loader.js")}!`,
						previousRequest: "",
						request: `${path.resolve(
							fixtures,
							"keys-loader.js"
						)}?loader-query!${path.resolve(fixtures, "set-empty-resource-loader.js")}!`,
						data: null,
						loaders: [
							{
								request: `${path.resolve(fixtures, "keys-loader.js")}?loader-query`,
								path: path.resolve(fixtures, "keys-loader.js"),
								query: "?loader-query",
								fragment: "",
								data: null,
								pitchExecuted: true,
								normalExecuted: true
							},
							{
								request: path.resolve(fixtures, "set-empty-resource-loader.js"),
								path: path.resolve(fixtures, "set-empty-resource-loader.js"),
								query: "",
								fragment: "",
								data: null,
								pitchExecuted: true,
								normalExecuted: true
							}
						]
					});
				} catch (err_) {
					return done(err_);
				}
				done();
			}
		);
	});

	describe("getContext", () => {
		const TESTS = [
			["/", "/"],
			["/path/file.js", "/path"],
			["/path/file.js#fragment", "/path"],
			["/path/file.js?query", "/path"],
			["/path/file.js?query#fragment", "/path"],
			["/path/\0#/file.js", "/path/#"],
			["/some/longer/path/file.js", "/some/longer/path"],
			["/file.js", "/"],
			["C:\\", "C:\\"],
			["C:\\file.js", "C:\\"],
			["C:\\some\\path\\file.js", "C:\\some\\path"],
			["C:\\path\\file.js", "C:\\path"],
			["C:\\path\\file.js#fragment", "C:\\path"],
			["C:\\path\\file.js?query", "C:\\path"],
			["C:\\path\\file.js?query#fragment", "C:\\path"],
			["C:\\path\\\0#\\file.js", "C:\\path\\#"]
		];
		for (const testCase of TESTS) {
			it(`should get the context of '${testCase[0]}'`, () => {
				expect(getContext(testCase[0])).toEqual(testCase[1]);
			});
		}
	});

	it("should pass arguments from processResource", (done) => {
		runLoaders(
			{
				resource: path.resolve(fixtures, "resource.bin"),
				processResource(loaderContext, resourcePath, callback) {
					fs.readFile(resourcePath, (err, content) => {
						if (err) return callback(err);
						return callback(null, content, "source-map", "other-arg");
					});
				}
			},
			(err, result) => {
				if (err) return done(err);
				expect(result.result).toEqual([
					Buffer.from("resource", "utf8"),
					"source-map",
					"other-arg"
				]);
				done();
			}
		);
	});
});
