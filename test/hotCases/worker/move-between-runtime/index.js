const update = () =>
	new Promise((resolve, reject) => {
		NEXT(err => {
			if (err) reject(err);
			else resolve();
		});
	});

const expectMessage = (w, msg) =>
	new Promise((resolve, reject) => {
		w.onmessage = ({ data }) => {
			if (data === msg) resolve();
			else reject(new Error(data));
		};
	});

const next = w => {
	const p = expectMessage(w, "next");
	w.postMessage("next");
	return p;
};

it("should support hot module replacement in WebWorkers", async () => {
	const a = new Worker(new URL("workerA.js", import.meta.url));
	const b = new Worker(new URL("workerB.js", import.meta.url));
	for (let i = 0; i < 7; i++) {
		await update();
		await next(a);
		await next(b);
	}
	await a.terminate();
	await b.terminate();
});
