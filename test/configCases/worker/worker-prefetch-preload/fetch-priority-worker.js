self.onmessage = function(e) {
	self.postMessage("fetch-priority-worker: " + e.data);
};

