// a classic worker script's top-level `this` is its global scope
this.onmessage = (event) => {
	this.postMessage(`got ${event.data}`);
};
