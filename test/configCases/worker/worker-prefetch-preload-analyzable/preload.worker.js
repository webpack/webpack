// trivial worker source
self.onmessage = (event) => {
	self.postMessage(`echo: ${event.data}`);
};
