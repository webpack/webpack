const doImport = () => import(/* webpackChunkName: "the-chunk" */ "./chunk");

it("should report evaluation errors during chunk load", () => {
	const windowListenersMock = setUpWindowListeners();
	const filename = "https://test.cases/path/the-chunk.js";
	const message = "Uncaught SyntaxError: Unexpected token";

	const promise = doImport();

	expect(document.head._children).toHaveLength(1);

	const script = document.head._children[0];
	expect(script.onload).toBeTypeOf("function");

	windowListenersMock.trigger("error", {type: "error", filename, message })
	script.onload({ type: "load", target: script });

	return promise.catch(err => {
		expect(err).toBeInstanceOf(Error);
		expect(err.name).toBe("ChunkLoadError");
		expect(err.type).toBe("missing");
		expect(err.request).toBe(filename);
		expect(err.message).toBe(
			`Loading chunk 625 failed.\n(missing: ${filename}) - ${message}`
		);
		expect(window.removeEventListener).toHaveBeenCalledTimes(1);

		windowListenersMock.resetGlobals();
	});
});


function setUpWindowListeners() {
	const realAddListener = window.addEventListener;
	const realRemoveListener = window.removeEventListener;
	const listeners = {};
	window.addEventListener = (type, callback) => {
		if (listeners[type] == null) {
			listeners[type] = [];
		}
		listeners[type].push(callback);
	};
	window.removeEventListener = jest.fn((type, callback) => {
		if (Array.isArray(listeners[type])) {
			listeners[type] = listeners[type].filter(cb => cb !== callback);
		}
	});

	return {
		resetGlobals() {
			window.addEventListener = realAddListener;
			window.removeEventListener = realRemoveListener;
		},
		trigger(type, event) {
			if (Array.isArray(listeners[type])) {
				listeners[type].forEach(cb => cb(event));
			}
		},
	};
}
