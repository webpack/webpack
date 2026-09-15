it("should throw what the failed module says when its generator has no generateError", () => {
	// anchored: the fallback writes the loader's own frame relative to the context
	expect(() => require("./a.plain")).toThrow(
		/^Module build failed \(from .*loader\.js\):\nError: plain boom\n {4}at Object\.loader \(\.\/loader\.js:\d+:\d+\)$/
	);
});
