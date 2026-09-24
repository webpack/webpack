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

it("should build a valid Unicode-mode matcher for concatenation requests with a hyphen in the prefix", async () => {
	const suffix = "a.js";
	// The static prefix `./dir/module-` contains a `-`. With the `u` flag
	// preserved, quoting it as `\-` would be an invalid escape and rebuilding
	// the wrapped-expression matcher would throw, failing the build.
	expect((await import("./dir/module-" + suffix)).default).toBe("a");
});

it("should build a valid Unicode-mode matcher for template-literal requests with a hyphen in the prefix", async () => {
	const suffix = "a.js";
	// Same for the wrapped-context (template-literal) path.
	expect((await import(`./dir/module-${suffix}`)).default).toBe("a");
});
