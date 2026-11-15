const dep = require("./dep.js");

self.onmessage = (event) => {
	self.postMessage(`${event.data}:${dep.marker}:${typeof self.marker}`);
};
