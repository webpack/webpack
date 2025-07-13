self.onmessage = function(e) {
	self.postMessage("low-priority-worker: " + e.data);
};

