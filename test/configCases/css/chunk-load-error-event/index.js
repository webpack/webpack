it("should expose the original error event on a failed css chunk load", () => {
	const promise = import(/* webpackChunkName: "the-style" */ "./style.css");

	// the <link> is appended synchronously while the import promise is pending
	const link = document.head._children.find(
		child => child.nodeName === "LINK" && child.onerror
	);
	expect(link).toBeDefined();

	// simulate the stylesheet failing to load (e.g. a blocked `@import`)
	const errorEvent = { type: "error", target: link };
	link.onerror(errorEvent);

	return promise.catch(err => {
		expect(err.name).toBe("ChunkLoadError");
		expect(err.type).toBe("error");
		expect(err.request).toMatch(/the-style.*\.css$/);
		// the new bit: the untouched DOM event carrying the failing <link>
		expect(err.event).toBe(errorEvent);
		expect(err.event.type).toBe("error");
		expect(err.event.target).toBe(link);
		expect(err.event.target.href).toBe(err.request);
	});
});
