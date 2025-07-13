self.onmessage = function(e) {
	self.postMessage("chunk-name-worker: " + e.data);
};

