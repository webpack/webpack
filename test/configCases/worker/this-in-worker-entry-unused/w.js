// exports are unused in both roles, so only the runtime tells them apart
this.onmessage = (event) => {
	this.postMessage(`got ${event.data}`);
};
