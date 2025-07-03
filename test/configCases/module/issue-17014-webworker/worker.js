import upper from "./module.js";

self.onmessage = async event => {

	postMessage(`data: ${upper(event.data)}, thanks`);
};
