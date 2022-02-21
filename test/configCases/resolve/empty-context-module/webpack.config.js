/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		cache: true,
		resolve: {
			alias: {
				foo: false
			},
			unsafeCache: true
		}
	},
	{
		resolve: {
			alias: {
				foo: false
			},
			unsafeCache: true
		}
	}
];
