const a = require("./worker-a.js");

self.onmessage = (event) => {
	self.postMessage(`${event.data}:${a.marker}`);
};
