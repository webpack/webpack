self.onmessage = function(e) {
	self.postMessage("prefetch-order-worker: " + e.data);
};

