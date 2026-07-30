export let disposed = false;

await using resource = {
	async [Symbol.asyncDispose]() {
		// Disposal must be fully awaited before the module reports completion.
		await 0;
		await 0;
		await 0;
		disposed = true;
	}
};
