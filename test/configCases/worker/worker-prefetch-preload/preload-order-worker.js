self.onmessage = function(e) {
	self.postMessage("preload-order-worker: " + e.data);
};

