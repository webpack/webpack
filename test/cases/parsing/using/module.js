let disposed = false;

using resource = {
	[Symbol.dispose]: () => {
		disposed = true;
	}
};

export { resource, disposed };
