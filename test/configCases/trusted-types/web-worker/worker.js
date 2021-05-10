//importScripts("./imported.js");
onmessage = async event => {
	postMessage(`data: ${event.data}, thanks`);
};
