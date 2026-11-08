onmessage = async (event) => {
	const { value } = await import(/* webpackChunkName: "v%42" */ "./value");
	postMessage(`${event.data}: ${value}`);
};
