// Classic (non-module) worker
self.onmessage = function(e) {
	self.postMessage("classic-prefetch-worker: " + e.data);
};