module.exports = function supportsUsing() {
	try {
		const f = eval(`(function f() {
			let disposed = false;

			{
				const getResource = () => {
					return {
						[Symbol.dispose]: () => {
							disposed = true;
						}
					}
				}
				using resource = getResource();
			}

			return disposed;
		})`);
		return f() === true;
	} catch (_err) {
		return false;
	}
};
