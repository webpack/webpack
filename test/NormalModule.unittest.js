"use strict";

const SourceMapSource = require("webpack-sources").SourceMapSource;
const OriginalSource = require("webpack-sources").OriginalSource;
const RawSource = require("webpack-sources").RawSource;
const NormalModule = require("../lib/NormalModule");
const HarmonyImportSideEffectDependency = require("../lib/dependencies/HarmonyImportSideEffectDependency");

/** @typedef {import("../lib/NormalModule").LoaderItem} LoaderItem */
/** @typedef {import("../lib/Parser")} Parser */
/** @typedef {import("../lib/Generator")} Generator */
/** @typedef {import("../lib/ModuleGraph")} ModuleGraph */
/** @typedef {import("../lib/dependencies/ImportPhase").ImportPhaseType} ImportPhaseType */

describe("NormalModule", () => {
	/** @type {InstanceType<typeof NormalModule>} */
	let normalModule;
	/** @type {string} */
	let request;
	/** @type {string} */
	let userRequest;
	/** @type {string} */
	let rawRequest;
	/** @type {LoaderItem[]} */
	let loaders;
	/** @type {string} */
	let resource;
	/** @type {Parser} */
	let parser;

	beforeEach(() => {
		request = "/some/request";
		userRequest = "/some/userRequest";
		rawRequest = "some/rawRequest";
		/** @type {LoaderItem[]} */
		loaders = [];
		resource = "/some/resource";
		parser = /** @type {Parser} */ (
			/** @type {unknown} */ ({
				parse() {}
			})
		);
		normalModule = new NormalModule(
			/** @type {import("../lib/NormalModule").NormalModuleCreateData} */ (
				/** @type {unknown} */ ({
					type: "javascript/auto",
					request,
					userRequest,
					rawRequest,
					loaders,
					resource,
					parser,
					generator: null,
					resolveOptions: {}
				})
			)
		);
		normalModule.buildInfo = {
			cacheable: true
		};
		normalModule.useSimpleSourceMap = true;
	});

	describe("#identifier", () => {
		it("returns an identifier for this module", () => {
			expect(normalModule.identifier()).toBe(request);
		});

		it("returns an identifier from toString", () => {
			normalModule.debugId = 1000;
			expect(normalModule.toString()).toBe("Module[1000: /some/request]");
		});
	});

	describe("#readableIdentifier", () => {
		it("calls the given requestShortener with the user request", () => {
			const spy = jest.fn();
			normalModule.readableIdentifier(
				/** @type {import("../lib/RequestShortener")} */ (
					/** @type {unknown} */ ({
						shorten: spy
					})
				)
			);
			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy.mock.calls[0][0]).toBe(userRequest);
		});
	});

	describe("#libIdent", () => {
		it("contextifies the userRequest of the module", () => {
			expect(
				normalModule.libIdent({
					context: "/some/context"
				})
			).toBe("../userRequest");
		});

		describe("given a userRequest containing loaders", () => {
			beforeEach(() => {
				userRequest =
					"/some/userRequest!/some/other/userRequest!/some/thing/is/off/here";
				normalModule = new NormalModule(
					/** @type {import("../lib/NormalModule").NormalModuleCreateData} */ (
						/** @type {unknown} */ ({
							type: "javascript/auto",
							request,
							userRequest,
							rawRequest,
							loaders,
							resource,
							parser
						})
					)
				);
			});

			it("contextifies every path in the userRequest", () => {
				expect(
					normalModule.libIdent({
						context: "/some/context"
					})
				).toBe("../userRequest!../other/userRequest!../thing/is/off/here");
			});
		});

		describe("given a userRequest containing query parameters", () => {
			it("ignores paths in query parameters", () => {
				// cspell:word testpath
				userRequest =
					"F:\\some\\context\\loader?query=foo\\bar&otherPath=testpath/other";
				normalModule = new NormalModule(
					/** @type {import("../lib/NormalModule").NormalModuleCreateData} */ (
						/** @type {unknown} */ ({
							type: "javascript/auto",
							request,
							userRequest,
							rawRequest,
							loaders,
							resource,
							parser
						})
					)
				);
				expect(
					normalModule.libIdent({
						context: "F:\\some\\context"
					})
				).toBe("./loader?query=foo\\bar&otherPath=testpath/other");
			});
		});
	});

	describe("#nameForCondition", () => {
		it("return the resource", () => {
			expect(normalModule.nameForCondition()).toBe(resource);
		});

		describe("given a resource containing a ?-sign", () => {
			const baseResource = "some/resource";

			beforeEach(() => {
				resource = `${baseResource}?some=query`;
				normalModule = new NormalModule(
					/** @type {import("../lib/NormalModule").NormalModuleCreateData} */ (
						/** @type {unknown} */ ({
							type: "javascript/auto",
							request,
							userRequest,
							rawRequest,
							loaders,
							resource,
							parser
						})
					)
				);
			});

			it("return only the part before the ?-sign", () => {
				expect(normalModule.nameForCondition()).toBe(baseResource);
			});
		});
	});

	describe("#createSourceForAsset", () => {
		/** @type {string} */
		let name;
		/** @type {string} */
		let content;
		/** @type {string | (() => void)} */
		let sourceMap;

		beforeEach(() => {
			name = "some name";
			content = "some content";
			sourceMap = "some sourcemap";
		});

		describe("given no sourcemap", () => {
			it("returns a RawSource", () => {
				expect(
					normalModule.createSourceForAsset("/", name, content)
				).toBeInstanceOf(RawSource);
			});
		});

		describe("given a string as the sourcemap", () => {
			it("returns a OriginalSource", () => {
				expect(
					normalModule.createSourceForAsset(
						"/",
						name,
						content,
						/** @type {string} */ (sourceMap)
					)
				).toBeInstanceOf(OriginalSource);
			});
		});

		describe("given a some other kind of sourcemap (source maps disabled)", () => {
			beforeEach(() => {
				sourceMap = () => {};
				normalModule.useSimpleSourceMap = false;
			});

			it("returns a SourceMapSource", () => {
				expect(
					normalModule.createSourceForAsset(
						"/",
						name,
						content,
						/** @type {string} */ (/** @type {unknown} */ (sourceMap))
					)
				).toBeInstanceOf(RawSource);
			});
		});

		describe("given a some other kind of sourcemap (simple source maps enabled)", () => {
			beforeEach(() => {
				sourceMap = () => {};
			});

			it("returns a SourceMapSource", () => {
				expect(
					normalModule.createSourceForAsset(
						"/",
						name,
						content,
						/** @type {string} */ (/** @type {unknown} */ (sourceMap))
					)
				).toBeInstanceOf(RawSource);
			});
		});

		describe("given a some other kind of sourcemap (source maps enabled)", () => {
			beforeEach(() => {
				sourceMap = () => {};
				normalModule.useSourceMap = true;
			});

			it("returns a SourceMapSource", () => {
				expect(
					normalModule.createSourceForAsset(
						"/",
						name,
						content,
						/** @type {string} */ (/** @type {unknown} */ (sourceMap))
					)
				).toBeInstanceOf(SourceMapSource);
			});
		});
	});

	describe("#originalSource", () => {
		const expectedSource = "some source";

		beforeEach(() => {
			/** @type {EXPECTED_ANY} */ (normalModule)._source = new RawSource(
				expectedSource
			);
		});

		it("returns an original Source", () => {
			expect(normalModule.originalSource()).toBe(
				/** @type {EXPECTED_ANY} */ (normalModule)._source
			);
		});
	});

	describe("#applyNoParseRule", () => {
		/** @type {string | RegExp} */
		let rule;
		/** @type {string} */
		let content;

		describe("given a string as rule", () => {
			beforeEach(() => {
				rule = "some-rule";
			});

			describe("and the content starting with the string specified in rule", () => {
				beforeEach(() => {
					content = `${rule}some-content`;
				});

				it("returns true", () => {
					expect(
						/** @type {EXPECTED_ANY} */ (normalModule).shouldPreventParsing(
							rule,
							content
						)
					).toBe(true);
				});
			});

			describe("and the content does not start with the string specified in rule", () => {
				beforeEach(() => {
					content = "some-content";
				});

				it("returns false", () => {
					expect(
						/** @type {EXPECTED_ANY} */ (normalModule).shouldPreventParsing(
							rule,
							content
						)
					).toBe(false);
				});
			});
		});

		describe("given a regex as rule", () => {
			beforeEach(() => {
				rule = /some-rule/;
			});

			describe("and the content matches the rule", () => {
				beforeEach(() => {
					content = `${rule}some-content`;
				});

				it("returns true", () => {
					expect(
						/** @type {EXPECTED_ANY} */ (normalModule).shouldPreventParsing(
							rule,
							content
						)
					).toBe(true);
				});
			});

			describe("and the content does not match the rule", () => {
				beforeEach(() => {
					content = "some-content";
				});

				it("returns false", () => {
					expect(
						/** @type {EXPECTED_ANY} */ (normalModule).shouldPreventParsing(
							rule,
							content
						)
					).toBe(false);
				});
			});
		});
	});

	describe("#shouldPreventParsing", () => {
		/** @type {jest.Mock} */
		let applyNoParseRuleSpy;

		beforeEach(() => {
			applyNoParseRuleSpy = jest.fn();
			normalModule.applyNoParseRule = applyNoParseRuleSpy;
		});

		describe("given no noParseRule", () => {
			it("returns false", () => {
				expect(
					/** @type {EXPECTED_ANY} */ (normalModule).shouldPreventParsing()
				).toBe(false);
				expect(applyNoParseRuleSpy).not.toHaveBeenCalled();
			});
		});

		describe("given a noParseRule", () => {
			/** @type {boolean} */
			let returnValOfSpy;

			beforeEach(() => {
				returnValOfSpy = true;
				applyNoParseRuleSpy.mockReturnValue(returnValOfSpy);
			});

			describe("that is a string", () => {
				it("calls and returns whatever applyNoParseRule returns", () => {
					expect(
						/** @type {EXPECTED_ANY} */ (normalModule).shouldPreventParsing(
							"some rule"
						)
					).toBe(returnValOfSpy);
					expect(applyNoParseRuleSpy).toHaveBeenCalledTimes(1);
				});
			});

			describe("that is a regex", () => {
				it("calls and returns whatever applyNoParseRule returns", () => {
					expect(
						/** @type {EXPECTED_ANY} */ (normalModule).shouldPreventParsing(
							"some rule"
						)
					).toBe(returnValOfSpy);
					expect(applyNoParseRuleSpy).toHaveBeenCalledTimes(1);
				});
			});

			describe("that is an array", () => {
				describe("of strings and or regexps", () => {
					/** @type {(string | RegExp)[]} */
					let someRules;

					beforeEach(() => {
						someRules = ["some rule", /some rule1/, "some rule2"];
					});

					describe("and none of them match", () => {
						beforeEach(() => {
							returnValOfSpy = false;
							applyNoParseRuleSpy.mockReturnValue(returnValOfSpy);
						});

						it("returns false", () => {
							expect(
								/** @type {EXPECTED_ANY} */ (normalModule).shouldPreventParsing(
									someRules
								)
							).toBe(returnValOfSpy);
							expect(applyNoParseRuleSpy).toHaveBeenCalledTimes(3);
						});
					});

					describe("and the first of them matches", () => {
						beforeEach(() => {
							returnValOfSpy = true;
							applyNoParseRuleSpy.mockReturnValue(returnValOfSpy);
						});

						it("returns true", () => {
							expect(
								/** @type {EXPECTED_ANY} */ (normalModule).shouldPreventParsing(
									someRules
								)
							).toBe(returnValOfSpy);
							expect(applyNoParseRuleSpy).toHaveBeenCalledTimes(1);
						});
					});

					describe("and the last of them matches", () => {
						beforeEach(() => {
							returnValOfSpy = true;
							applyNoParseRuleSpy.mockReturnValueOnce(false);
							applyNoParseRuleSpy.mockReturnValueOnce(false);
							applyNoParseRuleSpy.mockReturnValue(true);
						});

						it("returns true", () => {
							expect(
								/** @type {EXPECTED_ANY} */ (normalModule).shouldPreventParsing(
									someRules
								)
							).toBe(returnValOfSpy);
							expect(applyNoParseRuleSpy).toHaveBeenCalledTimes(3);
						});
					});
				});
			});
		});
	});

	describe("#getSideEffectsConnectionState", () => {
		// Builds a synthetic linear chain of `count` side-effect-free modules
		// linked by HarmonyImportSideEffectDependency. Walking the chain via
		// the recursive form used 2 stack frames per module and overflowed on
		// long chains (issue #20986).
		/**
		 * @param {number} count chain length
		 * @returns {{ modules: InstanceType<typeof NormalModule>[], moduleGraph: ModuleGraph }} chain
		 */
		const buildChain = (count) => {
			const modules = [];
			for (let i = 0; i < count; i++) {
				const mod = new NormalModule(
					/** @type {import("../lib/NormalModule").NormalModuleCreateData} */ (
						/** @type {unknown} */ ({
							type: "javascript/auto",
							request: `/m${i}`,
							userRequest: `/m${i}`,
							rawRequest: `m${i}`,
							loaders: [],
							resource: `/m${i}`,
							parser: { parse() {} },
							generator: null,
							resolveOptions: {}
						})
					)
				);
				mod.buildMeta = { sideEffectFree: true };
				modules.push(mod);
			}
			const depToModule = new Map();
			for (let i = 0; i < count - 1; i++) {
				const dep = new HarmonyImportSideEffectDependency(
					`m${i + 1}`,
					0,
					/** @type {ImportPhaseType} */ (/** @type {unknown} */ ("evaluation"))
				);
				modules[i].dependencies = [dep];
				depToModule.set(dep, modules[i + 1]);
			}
			modules[count - 1].dependencies = [];
			const moduleGraph = /** @type {ModuleGraph} */ (
				/** @type {unknown} */ ({
					/** @param {import("../lib/Dependency")} dep dependency @returns {InstanceType<typeof import("../lib/NormalModule")> | undefined} module */
					getModule: (dep) => depToModule.get(dep),
					getOptimizationBailout: () => []
				})
			);
			return { modules, moduleGraph };
		};

		it("handles deep linear chains without overflowing the stack", () => {
			const { modules, moduleGraph } = buildChain(20000);
			expect(modules[0].getSideEffectsConnectionState(moduleGraph)).toBe(false);
		});

		it("propagates a deep-chain bailout all the way back to the root", () => {
			// 5000 modules is far beyond what the recursive walker would walk
			// using V8 stack frames; the linear-chain peeling code path must
			// still propagate a bailout deep in the tail back to module 0.
			const { modules, moduleGraph } = buildChain(5000);
			modules[4500].buildMeta = { sideEffectFree: false };
			expect(modules[0].getSideEffectsConnectionState(moduleGraph)).toBe(true);
			expect(modules[0]._isEvaluatingSideEffects).toBe(false);
			expect(modules[4499]._isEvaluatingSideEffects).toBe(false);
		});

		it("detects cycles in the side-effect graph", () => {
			const { modules, moduleGraph } = buildChain(50);
			// close the loop: last module's dep points to modules[0]
			const lastDep = new HarmonyImportSideEffectDependency(
				"m0",
				0,
				/** @type {ImportPhaseType} */ (/** @type {unknown} */ ("evaluation"))
			);
			modules[49].dependencies = [lastDep];
			const originalGetModule = moduleGraph.getModule;
			moduleGraph.getModule = /** @type {ModuleGraph["getModule"]} */ (
				/** @param {import("../lib/Dependency")} dep dependency @returns {InstanceType<typeof import("../lib/NormalModule")> | undefined} module */
				(dep) => (dep === lastDep ? modules[0] : originalGetModule(dep))
			);
			// Cycles fold to `false` (the accumulator's identity) when all
			// participating modules are side-effect free — same as the original
			// recursive behavior.
			expect(modules[0].getSideEffectsConnectionState(moduleGraph)).toBe(false);
			expect(modules[0]._isEvaluatingSideEffects).toBe(false);
		});

		it("reports the bailout dep when a chain member has side effects", () => {
			const { modules, moduleGraph } = buildChain(10);
			// Make module 5 have side effects.
			modules[5].buildMeta = { sideEffectFree: false };
			const bailouts = new Map();
			/** @type {EXPECTED_ANY} */ (moduleGraph).getOptimizationBailout =
				/**
				 * @param {import("../lib/NormalModule")} mod module
				 * @returns {unknown[]} bailout list
				 */
				(mod) => {
					if (!bailouts.has(mod)) bailouts.set(mod, []);
					return bailouts.get(mod);
				};
			expect(modules[0].getSideEffectsConnectionState(moduleGraph)).toBe(true);
			// Each ancestor in the chain (modules 0..4) records the bailout once
			// for the dep that triggered descent, matching the recursive baseline.
			for (let i = 0; i < 5; i++) {
				const list = bailouts.get(modules[i]);
				expect(list).toHaveLength(1);
				expect(list[0]()).toMatch(
					/Dependency \(harmony side effect evaluation\)/
				);
			}
		});

		it("aggregates state across branching deps", () => {
			// Diamond: root depends on two side-effect-free leaves.
			/**
			 * @param {string} id module id
			 */
			const make = (id) => {
				const mod = new NormalModule(
					/** @type {import("../lib/NormalModule").NormalModuleCreateData} */ (
						/** @type {unknown} */ ({
							type: "javascript/auto",
							request: `/${id}`,
							userRequest: `/${id}`,
							rawRequest: id,
							loaders: [],
							resource: `/${id}`,
							parser: { parse() {} },
							generator: null,
							resolveOptions: {}
						})
					)
				);
				mod.buildMeta = { sideEffectFree: true };
				mod.dependencies = [];
				return mod;
			};
			const root = make("root");
			const a = make("a");
			const b = make("b");
			const depA = new HarmonyImportSideEffectDependency(
				"a",
				0,
				/** @type {ImportPhaseType} */ (/** @type {unknown} */ ("evaluation"))
			);
			const depB = new HarmonyImportSideEffectDependency(
				"b",
				1,
				/** @type {ImportPhaseType} */ (/** @type {unknown} */ ("evaluation"))
			);
			root.dependencies = [depA, depB];
			const moduleGraph = /** @type {ModuleGraph} */ (
				/** @type {unknown} */ ({
					/** @param {import("../lib/Dependency")} dep dependency @returns {InstanceType<typeof import("../lib/NormalModule")> | undefined} module */
					getModule: (dep) => (dep === depA ? a : dep === depB ? b : undefined),
					getOptimizationBailout: () => []
				})
			);
			expect(root.getSideEffectsConnectionState(moduleGraph)).toBe(false);
			expect(root._isEvaluatingSideEffects).toBe(false);
			expect(a._isEvaluatingSideEffects).toBe(false);
			expect(b._isEvaluatingSideEffects).toBe(false);
		});

		it("handles a deep cyclic chain whose modules have extra non-recursive deps", () => {
			// Mirrors the canonical #20986 reproduction: each module has a
			// HarmonyImportSideEffectDependency to the next module plus
			// several other deps (modelled here by ConstDependency which
			// reports `false` from `getModuleEvaluationSideEffectsState`).
			// The last module's SideEffectDep closes the loop back to
			// module 0. Pre-fix this overflowed V8's stack at ~1300 modules
			// because the linear-chain walker only recognized 1-dep modules.
			const ConstDependency = require("../lib/dependencies/ConstDependency");

			const N = 5000;
			const modules = [];
			for (let i = 0; i < N; i++) {
				const mod = new NormalModule(
					/** @type {import("../lib/NormalModule").NormalModuleCreateData} */ (
						/** @type {unknown} */ ({
							type: "javascript/auto",
							request: `/m${i}`,
							userRequest: `/m${i}`,
							rawRequest: `m${i}`,
							loaders: [],
							resource: `/m${i}`,
							parser: { parse() {} },
							generator: null,
							resolveOptions: {}
						})
					)
				);
				mod.buildMeta = { sideEffectFree: true };
				modules.push(mod);
			}
			const depToModule = new Map();
			for (let i = 0; i < N; i++) {
				const sideDep = new HarmonyImportSideEffectDependency(
					`m${(i + 1) % N}`,
					0,
					/** @type {ImportPhaseType} */ (/** @type {unknown} */ ("evaluation"))
				);
				modules[i].dependencies = [
					sideDep,
					new ConstDependency("", [0, 0]),
					new ConstDependency("", [0, 0])
				];
				depToModule.set(sideDep, modules[(i + 1) % N]);
			}
			const moduleGraph = /** @type {ModuleGraph} */ (
				/** @type {unknown} */ ({
					/** @param {import("../lib/Dependency")} dep dependency @returns {InstanceType<typeof import("../lib/NormalModule")> | undefined} module */
					getModule: (dep) => depToModule.get(dep),
					getOptimizationBailout: () => []
				})
			);
			expect(modules[0].getSideEffectsConnectionState(moduleGraph)).toBe(false);
		});

		it("falls back to iterative walk past the recursion limit on non-linear graphs", () => {
			// Each module has two `HarmonyImportSideEffectDependency`s, so
			// the linear-chain fast path can't apply: the module's first
			// dep continues the chain, the second points to a shared
			// side-effect-free leaf. The walker therefore enters the
			// general for-loop, recurses one V8 frame per module, and
			// must switch to `walkSideEffectsIterative` once depth crosses
			// `SIDE_EFFECTS_RECURSION_LIMIT` (2000). 2500 modules is far
			// enough past that boundary that any regression in the
			// iterative fallback path will overflow V8's stack.
			const N = 2500;
			/**
			 * @param {string} id module id
			 */
			const make = (id) => {
				const mod = new NormalModule(
					/** @type {import("../lib/NormalModule").NormalModuleCreateData} */ (
						/** @type {unknown} */ ({
							type: "javascript/auto",
							request: `/${id}`,
							userRequest: `/${id}`,
							rawRequest: id,
							loaders: [],
							resource: `/${id}`,
							parser: { parse() {} },
							generator: null,
							resolveOptions: {}
						})
					)
				);
				mod.buildMeta = { sideEffectFree: true };
				return mod;
			};
			const leaf = make("leaf");
			leaf.dependencies = [];
			const modules = [];
			for (let i = 0; i < N; i++) modules.push(make(`m${i}`));
			const depToModule = new Map();
			for (let i = 0; i < N - 1; i++) {
				const next = new HarmonyImportSideEffectDependency(
					`m${i + 1}`,
					0,
					/** @type {ImportPhaseType} */ (/** @type {unknown} */ ("evaluation"))
				);
				const aside = new HarmonyImportSideEffectDependency(
					"leaf",
					1,
					/** @type {ImportPhaseType} */ (/** @type {unknown} */ ("evaluation"))
				);
				modules[i].dependencies = [next, aside];
				depToModule.set(next, modules[i + 1]);
				depToModule.set(aside, leaf);
			}
			modules[N - 1].dependencies = [];
			const moduleGraph = /** @type {ModuleGraph} */ (
				/** @type {unknown} */ ({
					/** @param {import("../lib/Dependency")} dep dependency @returns {InstanceType<typeof import("../lib/NormalModule")> | undefined} module */
					getModule: (dep) => depToModule.get(dep),
					getOptimizationBailout: () => []
				})
			);
			expect(modules[0].getSideEffectsConnectionState(moduleGraph)).toBe(false);
			for (let i = 0; i < N; i++) {
				expect(modules[i]._isEvaluatingSideEffects).toBe(false);
			}
		});
	});
});
