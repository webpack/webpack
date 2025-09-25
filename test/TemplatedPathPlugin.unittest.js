"use strict";

const TemplatedPathPlugin = require("../lib/TemplatedPathPlugin");

describe("TemplatedPathPlugin", () => {
	describe("hash should be non-numeric", () => {
		// Move capturedPathReplacer to higher scope to be accessible in all describe blocks
		let capturedPathReplacer;

		// Set up capturedPathReplacer for all tests
		beforeEach(() => {
			const mockCompilation = {
				hooks: {
					assetPath: {
						tap: jest.fn((pluginName, pathReplacerFn) => {
							capturedPathReplacer = pathReplacerFn;
						})
					}
				}
			};

			const mockCompiler = {
				hooks: {
					compilation: {
						tap: jest.fn((pluginName, compilationFn) => {
							compilationFn(mockCompilation);
						})
					}
				}
			};

			// Apply the plugin to capture the path replacer function
			const plugin = new TemplatedPathPlugin();
			plugin.apply(mockCompiler);
		});

		it("should prevent numeric-only chunkhash in filename templates", () => {
			const mockChunk = {
				id: "test-chunk",
				name: "test-chunk",
				renderedHash: "123456789012345678901234567890",
				hash: "123456789012345678901234567890"
			};

			const pathData = {
				chunk: mockChunk,
				chunkGraph: {},
				runtime: undefined
			};

			const result = capturedPathReplacer("[name].[chunkhash:8].js", pathData);

			// Should convert numeric-only hash to include letter prefix
			expect(result).toBe("test-chunk.b2345678.js");
			expect(result).toMatch(/^test-chunk\.[a-f]\d{7}\.js$/);
			expect(result).not.toMatch(/^test-chunk\.\d{8}\.js$/);
		});

		it("should prevent numeric-only contenthash in filename templates", () => {
			const mockChunk = {
				id: "content-chunk",
				name: "content-chunk",
				renderedHash: "abc123def456",
				hash: "abc123def456",
				contentHash: {
					javascript: "987654321098765432109876543210"
				}
			};

			const pathData = {
				chunk: mockChunk,
				contentHashType: "javascript",
				chunkGraph: {},
				runtime: undefined
			};

			const result = capturedPathReplacer(
				"[name].[contenthash:6].js",
				pathData
			);

			// Should convert numeric-only hash to include letter prefix
			expect(result).toBe("content-chunk.d87654.js");
			expect(result).toMatch(/^content-chunk\.[a-f]\d{5}\.js$/);
			expect(result).not.toMatch(/^content-chunk\.\d{6}\.js$/);
		});

		it("should prevent numeric-only fullhash in filename templates", () => {
			const pathData = {
				hash: "111111111111111111111111111111",
				chunkGraph: {},
				runtime: undefined
			};

			const result = capturedPathReplacer("bundle.[fullhash:10].js", pathData);

			// Should convert numeric-only hash to include letter prefix
			expect(result).toBe("bundle.b111111111.js");
			expect(result).toMatch(/^bundle\.[a-f]\d{9}\.js$/);
			expect(result).not.toMatch(/^bundle\.\d{10}\.js$/);
		});

		it("should preserve alphanumeric hashes unchanged", () => {
			const mockChunk = {
				id: "mixed-chunk",
				name: "mixed-chunk",
				renderedHash: "abc123def456ghi789jkl012mno345",
				hash: "abc123def456ghi789jkl012mno345"
			};

			const pathData = {
				chunk: mockChunk,
				chunkGraph: {},
				runtime: undefined
			};

			const result = capturedPathReplacer("[name].[chunkhash:8].js", pathData);

			// Should preserve original hash since it contains non-numeric chars
			expect(result).toBe("mixed-chunk.abc123de.js");
		});

		it("should handle zero-length hash parameter", () => {
			const mockChunk = {
				id: "zero-chunk",
				name: "zero-chunk",
				renderedHash: "123456789012345678901234567890",
				hash: "123456789012345678901234567890"
			};

			const pathData = {
				chunk: mockChunk,
				chunkGraph: {},
				runtime: undefined
			};

			const result = capturedPathReplacer("[name].[chunkhash:0].js", pathData);

			// When length is 0, it's treated as falsy and returns the full hash
			expect(result).toBe("zero-chunk.123456789012345678901234567890.js");
		});
	});
});
