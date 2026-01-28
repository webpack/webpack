const cjs = require("./cjs-module");

onmessage = event => {
	postMessage({ value: cjs.getValue() });
};
