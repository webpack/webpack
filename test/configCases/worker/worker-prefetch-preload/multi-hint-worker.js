self.onmessage = function(e) {
	self.postMessage("multi-hint-worker: " + e.data);
};