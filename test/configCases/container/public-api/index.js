it("should run the plugin API helpers through the public exports", () => {
	expect(PUBLIC_API).toEqual({
		range: "^1.2.3",
		urlAndGlobal: ["https://example.com/remote.js", "remote"],
		undoPath: "../../",
		sorted: [1, 2, 3],
		subset: true,
		dependencyIsDependency: true,
		errorIsWebpackError: true,
		runtimeModuleIsRuntimeModule: true
	});
});

