const isBrowser = typeof window !== "undefined";

// SSR registry lives on globalThis, namespaced by uniqueName
function collectedCss() {
	const key = Object.keys(globalThis).find((k) =>
		k.startsWith("__webpack_css__")
	);
	return key ? globalThis[key] : undefined;
}

it("loads a dynamically imported CSS chunk on both web and node", async () => {
	// link-type CSS chunk loading: a <link> on web, a file read on node
	const m = await import("./async.js");
	expect(typeof m.foo).toBe("string");
	expect(m.foo).toContain("foo");

	if (!isBrowser) {
		// node: the emitted CSS file is read and collected for SSR retrieval
		const registry = collectedCss();
		expect(registry).toBeTruthy();
		expect(Object.values(registry).join("\n")).toContain("color: red");
	}
});
