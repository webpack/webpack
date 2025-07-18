self.onconnect = function(e) {
	const port = e.ports[0];

	port.onmessage = function(event) {
		port.postMessage("shared-worker: " + event.data);
	};

	port.start();
};
