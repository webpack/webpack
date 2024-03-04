const path = require("path");

let getCounter = 0;
let setConter = 0;

const unsafeCache = new Proxy(
	{},
	{
		get(target, key, receiver) {
			getCounter += 1;

			return Reflect.get(target, key, receiver);
		},
		set(target, key, value, receiver) {
			setConter += 1;

			return Reflect.set(target, key, value, receiver);
		}
	}
);

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.done.tap("TestPlugin", () => {
					if (getCounter === 0 || setConter === 0) {
						throw new Error(
							"resolve.unsafeCache doesn't work with the `Proxy`"
						);
					}
				});
			}
		}
	],
	resolve: {
		alias: {
			_: [path.resolve(__dirname, "a"), path.resolve(__dirname, "b")]
		},
		unsafeCache
	}
};
