export function upper(str) {
	return str.toUpperCase();
}

self.onmessage = async event => {
	postMessage(`data: ${upper(event.data)}, thanks`);
};
