"use strict";

const path = require("path");
const ContextModule = require("../lib/ContextModule");
const RequestShortener = require("../lib/RequestShortener");
const RuntimeTemplate = require("../lib/RuntimeTemplate");
const ContextElementDependency = require("../lib/dependencies/ContextElementDependency");

describe("contextModule", () => {
	let contextModule;
	/** @type {string} */
	let request;

	beforeEach(() => {
		request = "/some/request";
	});

	describe("#identifier", () => {
		it("returns an safe identifier for this module", () => {
			contextModule = new ContextModule(
				() => {},
				/** @type {import("../lib/ContextModule").ContextModuleOptions} */ (
					/** @type {unknown} */ ({
						type: "javascript/auto",
						request,
						resource: "a",
						mode: "lazy",
						regExp: /a|b/
					})
				)
			);
			expect(contextModule.identifier()).toEqual(
				expect.stringContaining("/a%7Cb/")
			);
		});
	});

	describe("getGlobImportPropertyAccess", () => {
		/** @type {import("../lib/ContextModule").ContextModuleOptions} */
		const baseOptions = {
			resource: "a",
			mode: "sync",
			recursive: false,
			regExp: false
		};

		it("returns undefined when globImport is missing, empty, or '*'", () => {
			contextModule = new ContextModule(() => {}, baseOptions);
			expect(contextModule.getGlobImportPropertyAccess()).toBeUndefined();

			contextModule = new ContextModule(() => {}, {
				...baseOptions,
				globImport: "*"
			});
			expect(contextModule.getGlobImportPropertyAccess()).toBeUndefined();
		});

		it("uses dot access for safe identifier export names", () => {
			contextModule = new ContextModule(() => {}, {
				...baseOptions,
				globImport: "namedExport"
			});
			expect(contextModule.getGlobImportPropertyAccess()).toBe(".namedExport");
		});

		it("uses bracket access for non-identifier export names", () => {
			contextModule = new ContextModule(() => {}, {
				...baseOptions,
				globImport: "foo-bar"
			});
			expect(contextModule.getGlobImportPropertyAccess()).toBe('["foo-bar"]');
		});

		it("uses bracket access for reserved export names", () => {
			contextModule = new ContextModule(() => {}, {
				...baseOptions,
				globImport: "default"
			});
			expect(contextModule.getGlobImportPropertyAccess()).toBe('["default"]');
		});
	});

	describe("glob identifier", () => {
		it("includes globContext in module identifier", () => {
			const contextA = path.join("/root", "p");
			const contextB = path.join("/root", "q");
			const moduleA = new ContextModule(
				() => {},
				/** @type {import("../lib/ContextModule").ContextModuleOptions} */ ({
					resource: "/root",
					mode: "sync",
					recursive: true,
					regExp: false,
					globPatterns: ["../shared/*.js", "./*.js"],
					globContext: contextA
				})
			);
			const moduleB = new ContextModule(
				() => {},
				/** @type {import("../lib/ContextModule").ContextModuleOptions} */ ({
					resource: "/root",
					mode: "sync",
					recursive: true,
					regExp: false,
					globPatterns: ["../shared/*.js", "./*.js"],
					globContext: contextB
				})
			);
			expect(moduleA.identifier()).not.toEqual(moduleB.identifier());
			expect(moduleA.identifier()).toContain(contextA);
			expect(moduleB.identifier()).toContain(contextB);
		});
	});

	describe("getGlobSyncSource", () => {
		it("keeps user requests when module factorization fails", () => {
			const resolvedModule = /** @type {import("../lib/Module")} */ ({
				buildMeta: {}
			});
			const depResolved = new ContextElementDependency(
				"./resolved.js",
				"./resolved.js",
				undefined,
				"esm"
			);
			const depMissing = new ContextElementDependency(
				"./missing.js",
				"./missing.js",
				undefined,
				"esm"
			);
			const moduleGraph = {
				/**
				 * @param {import("../lib/Dependency")} dep dependency
				 * @returns {import("../lib/Module") | null} module
				 */
				getModule: (dep) => (dep === depResolved ? resolvedModule : null)
			};
			const chunkGraph = {
				moduleGraph,
				getModuleId: () => 1
			};
			const runtimeTemplate = new RuntimeTemplate(
				/** @type {import("../lib/Compilation")} */ (
					/** @type {unknown} */ (undefined)
				),
				/** @type {import("../lib/config/defaults").OutputNormalizedWithDefaults} */ (
					/** @type {unknown} */ ({ environment: { templateLiteral: false } })
				),
				new RequestShortener(__dirname)
			);
			const contextModule = new ContextModule(
				() => {},
				/** @type {import("../lib/ContextModule").ContextModuleOptions} */ ({
					resource: "a",
					mode: "sync",
					recursive: true,
					regExp: false,
					globPatterns: ["./dir/*.js"]
				})
			);
			const source = contextModule.getGlobSyncSource(
				[depMissing, depResolved],
				/** @type {import("../lib/ChunkGraph")} */ (
					/** @type {unknown} */ (chunkGraph)
				),
				runtimeTemplate
			);
			expect(source).toContain(
				'"./missing.js": undefined /* "./missing.js" */'
			);
			expect(source).toContain('"./resolved.js"');
		});
	});
});
