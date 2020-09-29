onmessage = async event => {
	const template = event.data;
	const tmpl = await import("../require.context/templates/" + template);
	postMessage(tmpl());
}
