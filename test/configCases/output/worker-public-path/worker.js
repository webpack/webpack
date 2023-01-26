function upper(str) {
	return str.toUpperCase();
}
onmessage = async event => {
	postMessage(`data: ${upper(event.data)}, thanks`);
};
