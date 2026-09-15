it("should throw what the failed module says when its generator has no generateError", () => {
	let message = "";
	try {
		require("./a.plain");
	} catch (error) {
		message = error.message;
	}

	// the fallback writes the loader's own frame relative to the context
	expect(message).toMatch(
		/^Module build failed \(from .*loader\.js\):\nError: plain boom\n/
	);
	expect(message).toMatch(/\.\/loader\.js:\d+:\d+/);
	expect(message).not.toMatch(/[\s(](?:\/|[A-Za-z]:[\\/])/);
});
