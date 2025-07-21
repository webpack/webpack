const AssetPrefetchPreloadRuntimeModule = require("../../lib/runtime/AssetPrefetchPreloadRuntimeModule");
const Template = require("../../lib/Template");

describe("AssetPrefetchPreloadRuntimeModule", () => {
	const mockCompilation = {
		outputOptions: {
			crossOriginLoading: false
		}
	};
	const mockRuntimeTemplate = {
		basicFunction: (args, body) => {
			if (typeof body === "string") {
				return `function(${args}){${body}}`;
			}
			return `function(${args}){${Template.asString(body)}}`;
		}
	};

	beforeEach(() => {
		// Mock for runtime environment
		global.__webpack_require__ = {
			p: "/",
			u: id => `${id}.js`
		};
		global.RuntimeGlobals = {
			prefetchAsset: "__webpack_require__.PA",
			preloadAsset: "__webpack_require__.LA"
		};
		global.document = {
			head: {
				appendChild: jest.fn()
			},
			createElement: jest.fn(tag => ({
				tag,
				setAttribute: jest.fn()
			}))
		};
	});

	afterEach(() => {
		delete global.__webpack_require__;
		delete global.RuntimeGlobals;
		delete global.document;
	});

	describe("prefetch module", () => {
		it("should generate runtime code for prefetch", () => {
			const module = new AssetPrefetchPreloadRuntimeModule("prefetch");
			module.compilation = mockCompilation;
			module.runtimeTemplate = mockRuntimeTemplate;

			const code = module.generate();

			expect(code).toContain("__webpack_require__.PAQueue = [];");
			expect(code).toContain("__webpack_require__.PAQueueProcessing = false;");
			expect(code).toContain("processPrefetchQueue");
			expect(code).toContain("link.rel = 'prefetch';");
			expect(code).toContain("PAQueue.sort");
			expect(code).toContain("order: order || 0");
		});

		it("should support fetchPriority attribute", () => {
			const module = new AssetPrefetchPreloadRuntimeModule("prefetch");
			module.compilation = mockCompilation;
			module.runtimeTemplate = mockRuntimeTemplate;

			const code = module.generate();

			expect(code).toContain("if(item.fetchPriority)");
			expect(code).toContain("link.fetchPriority = item.fetchPriority;");
			expect(code).toContain("link.setAttribute('fetchpriority', item.fetchPriority);");
		});

		it("should handle numeric order for queue sorting", () => {
			const module = new AssetPrefetchPreloadRuntimeModule("prefetch");
			module.compilation = mockCompilation;
			module.runtimeTemplate = mockRuntimeTemplate;

			const code = module.generate();

			expect(code).toContain("// Sort queue by order (lower numbers first)");
			expect(code).toContain("return a.order - b.order;");
		});
	});

	describe("preload module", () => {
		it("should generate runtime code for preload", () => {
			const module = new AssetPrefetchPreloadRuntimeModule("preload");
			module.compilation = mockCompilation;
			module.runtimeTemplate = mockRuntimeTemplate;

			const code = module.generate();

			expect(code).toContain("__webpack_require__.LAQueue = [];");
			expect(code).toContain("__webpack_require__.LAQueueProcessing = false;");
			expect(code).toContain("processPreloadQueue");
			expect(code).toContain("link.rel = 'preload';");
			expect(code).toContain("LAQueue.sort");
			expect(code).toContain("order: order || 0");
		});

		it("should add nonce when crossOriginLoading is enabled", () => {
			const module = new AssetPrefetchPreloadRuntimeModule("preload");
			module.compilation = {
				outputOptions: {
					crossOriginLoading: true
				}
			};
			module.runtimeTemplate = mockRuntimeTemplate;

			const code = module.generate();

			expect(code).toContain("if(__webpack_require__.nc)");
			expect(code).toContain("link.setAttribute('nonce', __webpack_require__.nc);");
		});
	});

	describe("queue processing", () => {
		it("should process items sequentially with setTimeout", () => {
			const module = new AssetPrefetchPreloadRuntimeModule("prefetch");
			module.compilation = mockCompilation;
			module.runtimeTemplate = mockRuntimeTemplate;

			const code = module.generate();

			expect(code).toContain("// Process next item after a small delay to avoid blocking");
			expect(code).toContain("setTimeout(processNext, 0);");
		});

		it("should handle empty queue", () => {
			const module = new AssetPrefetchPreloadRuntimeModule("prefetch");
			module.compilation = mockCompilation;
			module.runtimeTemplate = mockRuntimeTemplate;

			const code = module.generate();

			expect(code).toContain("if (__webpack_require__.PAQueue.length === 0)");
			expect(code).toContain("__webpack_require__.PAQueueProcessing = false;");
			expect(code).toContain("return;");
		});
	});
});