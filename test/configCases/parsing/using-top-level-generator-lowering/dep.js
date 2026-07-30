export let disposed = false;

using resource = {
	[Symbol.dispose]() {
		disposed = true;
	}
};

// Lowerable top-level `await`, so the module body becomes a generator.
export const value = await Promise.resolve(42);
