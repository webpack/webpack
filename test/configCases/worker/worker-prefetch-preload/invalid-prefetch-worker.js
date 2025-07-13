self.onmessage = function(e) {
	self.postMessage("invalid-prefetch-worker: " + e.data);
};