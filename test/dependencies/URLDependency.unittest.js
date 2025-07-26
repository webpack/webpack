"use strict";

const URLDependency = require("../../lib/dependencies/URLDependency");
const RuntimeGlobals = require("../../lib/RuntimeGlobals");

describe("URLDependency", () => {
	describe("Template", () => {
		const mockSource = {
			replace: jest.fn()
		};
		
		const mockRuntimeTemplate = {
			moduleRaw: jest.fn().mockReturnValue("__webpack_require__(123)")
		};
		
		const mockModuleGraph = {
			getModule: jest.fn().mockReturnValue({
				request: "test.png"
			})
		};
		
		const mockChunkGraph = {};
		const mockRuntimeRequirements = new Set();

		beforeEach(() => {
			mockSource.replace.mockClear();
			mockRuntimeTemplate.moduleRaw.mockClear();
			mockRuntimeRequirements.clear();
		});

		it("should handle prefetch with fetchPriority", () => {
			const dep = new URLDependency(
				"./test.png",
				[10, 20],
				[0, 30],
				"prefetch"
			);
			dep.prefetch = true;
			dep.fetchPriority = "high";
			
			const template = new URLDependency.Template();
			template.apply(
				dep,
				mockSource,
				{
					runtimeTemplate: mockRuntimeTemplate,
					moduleGraph: mockModuleGraph,
					chunkGraph: mockChunkGraph,
					runtimeRequirements: mockRuntimeRequirements
				}
			);
			
			expect(mockRuntimeRequirements.has(RuntimeGlobals.prefetchAsset)).toBe(true);
			expect(mockRuntimeRequirements.has(RuntimeGlobals.baseURI)).toBe(true);
			
			const replacementCall = mockSource.replace.mock.calls[0];
			const replacementCode = replacementCall[2];
			
			expect(replacementCode).toContain("__webpack_require__.PA(url, \"image\", \"high\");");
			expect(replacementCode).toContain("new URL(__webpack_require__(123), __webpack_require__.b)");
		});

		it("should handle preload with fetchPriority", () => {
			const dep = new URLDependency(
				"./test.css",
				[10, 20],
				[0, 30],
				"preload"
			);
			dep.preload = true;
			dep.fetchPriority = "low";
			
			const template = new URLDependency.Template();
			template.apply(
				dep,
				mockSource,
				{
					runtimeTemplate: mockRuntimeTemplate,
					moduleGraph: {
						getModule: jest.fn().mockReturnValue({
							request: "test.css"
						})
					},
					chunkGraph: mockChunkGraph,
					runtimeRequirements: mockRuntimeRequirements
				}
			);
			
			expect(mockRuntimeRequirements.has(RuntimeGlobals.preloadAsset)).toBe(true);
			
			const replacementCall = mockSource.replace.mock.calls[0];
			const replacementCode = replacementCall[2];
			
			expect(replacementCode).toContain("__webpack_require__.LA(url, \"style\", \"low\");");
		});

		it("should handle both prefetch and preload (preload takes precedence)", () => {
			const dep = new URLDependency(
				"./test.js",
				[10, 20],
				[0, 30],
				"both"
			);
			dep.prefetch = true;
			dep.preload = true;
			dep.fetchPriority = "high";
			
			const template = new URLDependency.Template();
			template.apply(
				dep,
				mockSource,
				{
					runtimeTemplate: mockRuntimeTemplate,
					moduleGraph: {
						getModule: jest.fn().mockReturnValue({
							request: "test.js"
						})
					},
					chunkGraph: mockChunkGraph,
					runtimeRequirements: mockRuntimeRequirements
				}
			);
			
			// Should only have preload, not prefetch
			expect(mockRuntimeRequirements.has(RuntimeGlobals.preloadAsset)).toBe(true);
			expect(mockRuntimeRequirements.has(RuntimeGlobals.prefetchAsset)).toBe(false);
			
			const replacementCall = mockSource.replace.mock.calls[0];
			const replacementCode = replacementCall[2];
			
			expect(replacementCode).toContain("__webpack_require__.LA(url, \"script\", \"high\");");
			expect(replacementCode).not.toContain("__webpack_require__.PA");
		});

		it("should handle undefined fetchPriority", () => {
			const dep = new URLDependency(
				"./test.png",
				[10, 20],
				[0, 30],
				"prefetch"
			);
			dep.prefetch = true;
			// fetchPriority is undefined
			
			const template = new URLDependency.Template();
			template.apply(
				dep,
				mockSource,
				{
					runtimeTemplate: mockRuntimeTemplate,
					moduleGraph: mockModuleGraph,
					chunkGraph: mockChunkGraph,
					runtimeRequirements: mockRuntimeRequirements
				}
			);
			
			const replacementCall = mockSource.replace.mock.calls[0];
			const replacementCode = replacementCall[2];
			
			expect(replacementCode).toContain("__webpack_require__.PA(url, \"image\", undefined);");
		});

		it("should correctly determine asset types", () => {
			const testCases = [
				{ request: "test.png", expectedAs: "image" },
				{ request: "test.jpg", expectedAs: "image" },
				{ request: "test.webp", expectedAs: "image" },
				{ request: "test.css", expectedAs: "style" },
				{ request: "test.js", expectedAs: "script" },
				{ request: "test.mjs", expectedAs: "script" },
				{ request: "test.woff2", expectedAs: "font" },
				{ request: "test.ttf", expectedAs: "font" },
				{ request: "test.vtt", expectedAs: "track" },
				{ request: "test.mp4", expectedAs: "fetch" }, // video uses fetch
				{ request: "test.json", expectedAs: "fetch" },
				{ request: "test.wasm", expectedAs: "fetch" }
			];
			
			testCases.forEach(({ request, expectedAs }) => {
				const dep = new URLDependency(
					`./${request}`,
					[10, 20],
					[0, 30],
					"prefetch"
				);
				dep.prefetch = true;
				dep.fetchPriority = "high";
				
				const template = new URLDependency.Template();
				template.apply(
					dep,
					mockSource,
					{
						runtimeTemplate: mockRuntimeTemplate,
						moduleGraph: {
							getModule: jest.fn().mockReturnValue({ request })
						},
						chunkGraph: mockChunkGraph,
						runtimeRequirements: new Set()
					}
				);
				
				const replacementCall = mockSource.replace.mock.calls[0];
				const replacementCode = replacementCall[2];
				
				expect(replacementCode).toContain(`__webpack_require__.PA(url, "${expectedAs}", "high");`);
				
				mockSource.replace.mockClear();
			});
		});
	});
});