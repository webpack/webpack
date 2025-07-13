self.onmessage = function(e) {
	self.postMessage("normal-worker: " + e.data);
};

