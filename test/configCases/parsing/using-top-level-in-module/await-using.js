export let disposed = false;

await using resource = {
	[Symbol.dispose]() {
		disposed = true;
	}
};
