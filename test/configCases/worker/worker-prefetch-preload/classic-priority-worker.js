self.onmessage = function(e) {
	self.postMessage("classic-priority-worker: " + e.data);
};