if (global.neverSet) {
	new Worker(
		/* webpackEntryOptions: { publicPath: "/other/" } */
		new URL("./worker.js", import.meta.url)
	);
}
