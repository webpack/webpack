export default () => Promise.resolve(42);
---
export default async () => {
	const worker = new Worker(new URL("worker.js", import.meta.url));
	const result = await new Promise((resolve, reject) => {
		worker.onmessage = ({ data }) => {
			if(typeof data === "string") {
				reject(new Error(data));
			} else {
				resolve(data);
			}
		};
		worker.postMessage("compute");
	});
	await worker.terminate();
	return result;
}
---
export default () => Promise.resolve(42);
---
export default async () => {
	const worker = new Worker(new URL("worker.js", import.meta.url));
	const result = await new Promise((resolve, reject) => {
		worker.onmessage = ({ data }) => {
			if(typeof data === "string") {
				reject(new Error(data));
			} else {
				resolve(data);
			}
		};
		worker.postMessage("compute");
	});
	await worker.terminate();
	return result;
}
---
if(Math.random() < 0) {
	new Worker(new URL("worker.js?1", import.meta.url));
}
export default async () => {
	const worker = new Worker(new URL("worker.js", import.meta.url));
	const result = await new Promise((resolve, reject) => {
		worker.onmessage = ({ data }) => {
			if(typeof data === "string") {
				reject(new Error(data));
			} else {
				resolve(data);
			}
		};
		worker.postMessage("compute");
	});
	await worker.terminate();
	return result;
}
---
export default async () => {
	const worker = new Worker(new URL("worker.js", import.meta.url));
	const result = await new Promise((resolve, reject) => {
		worker.onmessage = ({ data }) => {
			if(typeof data === "string") {
				reject(new Error(data));
			} else {
				resolve(data);
			}
		};
		worker.postMessage("compute");
	});
	await worker.terminate();
	return result;
}
