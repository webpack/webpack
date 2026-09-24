it("should keep the `i` flag for concatenation context requests", async () => {
	const name = "module-a.js";
	// `import("./dir/" + name)` builds a wrapped context whose matcher is
	// rebuilt from `wrappedContextRegExp`; dropping its flags would exclude
	// `module-a.js` from the case-insensitive `/.*\.JS/i`.
	expect((await import("./dir/" + name)).default).toBe("a");
});

it("should keep the `i` flag for template-literal context requests", async () => {
	const name = "module-a.js";
	expect((await import(`./dir/${name}`)).default).toBe("a");
});
