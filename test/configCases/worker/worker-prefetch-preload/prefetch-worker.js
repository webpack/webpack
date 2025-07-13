self.onmessage = function(e) {
	self.postMessage("prefetch-worker: " + e.data);
};

