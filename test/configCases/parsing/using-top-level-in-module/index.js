it("should dispose a top-level `using` resource when the imported module finished evaluating", () =>
	import("./importer-using.js").then(({ disposedAfterImport }) => {
		expect(disposedAfterImport).toBe(true);
	}));

it("should dispose a top-level `await using` resource when the imported module finished evaluating", () =>
	import("./importer-await-using.js").then(({ results }) => {
		expect(results.awaitUsingDisposed).toBe(true);
	}));

it("should dispose a top-level `await using` resource with `Symbol.asyncDispose`", () =>
	import("./importer-await-using.js").then(({ results }) => {
		expect(results.asyncDisposeDisposed).toBe(true);
	}));
