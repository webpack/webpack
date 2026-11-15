// a worker's entry module that another worker in its runtime also requires
this.marker = "from-a";

self.onmessage = (event) => {
	self.postMessage(`${event.data}:a`);
};
