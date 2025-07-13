// Add some imports to ensure this creates a separate chunk
import { processData } from "./shared-module.js";

self.onmessage = function(e) {
	const processed = processData(e.data);
	self.postMessage("runtime-preload-worker: " + processed);
};

