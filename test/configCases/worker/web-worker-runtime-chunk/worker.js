onmessage = function (event) {
	postMessage("worker response: " + event.data);
};
