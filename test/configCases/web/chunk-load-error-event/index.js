// A developer's own retry/telemetry code can now read the original DOM event
// off the ChunkLoadError to tell a real network failure apart from a script
// that loaded but never registered its chunk.
const reason = err => (err.event ? err.event.type : "no-event");

it("should expose the original error event on a failed chunk load", () => {
	const promise = import(/* webpackChunkName: "the-chunk" */ "./chunk");

	const script = document.head._children[0];
	expect(script.onerror).toBeTypeOf("function");

	// simulate a network error while fetching the chunk
	const errorEvent = { type: "error", target: script };
	script.onerror(errorEvent);

	return promise.catch(err => {
		expect(err.name).toBe("ChunkLoadError");
		expect(err.type).toBe("error");
		expect(err.request).toBe("https://test.cases/path/the-chunk.js");
		// the new bit: the untouched DOM event, same way request is exposed
		expect(err.event).toBe(errorEvent);
		expect(err.event.type).toBe("error");
		expect(err.event.target).toBe(script);
		expect(err.event.target.src).toBe("https://test.cases/path/the-chunk.js");
		expect(reason(err)).toBe("error");
	});
});

it("should expose the original event when a chunk loads but never registers", () => {
	const promise = import(/* webpackChunkName: "the-chunk" */ "./chunk");

	const script = document.head._children[0];
	expect(script.onload).toBeTypeOf("function");

	// the script tag fired `load`, yet the chunk was never installed (e.g. an
	// interfering library or an evaluation error) — reported as `missing`
	const loadEvent = { type: "load", target: script };
	script.onload(loadEvent);

	return promise.catch(err => {
		expect(err.name).toBe("ChunkLoadError");
		expect(err.type).toBe("missing");
		expect(err.event).toBe(loadEvent);
		// a developer can now tell this apart from a network error: the browser
		// reported `load`, so the file arrived but did not register the chunk
		expect(err.event.type).toBe("load");
		expect(reason(err)).toBe("load");
	});
});
