onmessage = async event => {
	postMessage("worker received: " + event.data);
};
