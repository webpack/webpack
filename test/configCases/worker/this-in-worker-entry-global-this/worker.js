// a classic worker script's top-level `this` is its global scope
Object.defineProperty(this, "marker", { value: "defined" });
this.onmessage = (event) => {
	this.postMessage(
		`got ${event.data}:${this.marker}:${this === globalThis ? "globalThis" : "other"}`
	);
};
