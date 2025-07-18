self.onmessage = function(e) {
	self.postMessage("preload-worker: " + e.data);
};

