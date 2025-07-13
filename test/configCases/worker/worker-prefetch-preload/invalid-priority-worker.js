self.onmessage = function(e) {
	self.postMessage("invalid-priority-worker: " + e.data);
};