self.onmessage = function(e) {
	self.postMessage("classic-preload-worker: " + e.data);
};