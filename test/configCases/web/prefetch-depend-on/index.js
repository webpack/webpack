it("prefetches a chunk from an entry that shares a runtime through dependOn", async () => {
	const links = document.head._children.filter(
		(node) => node._type === "link" && node.rel === "prefetch"
	);
	expect(links.map((link) => link.href)).toEqual([
		"https://example.com/path/lazy.js"
	]);

	const promise = import(
		/* webpackChunkName: "lazy", webpackPrefetch: true */ "./lazy"
	);
	const children = document.head._children;
	const script = children[children.length - 1];
	expect(script._type).toBe("script");
	__non_webpack_require__("./lazy.js");
	script.onload();
	expect((await promise).default).toBe("lazy");
});
