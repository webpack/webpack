let pluginExecutionCounter = 0;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.done.tap("TestPlugin", () => {
					expect(pluginExecutionCounter).toBe(4);
				});
			}
		}
	],
	resolve: {
		plugins: [
			{
				apply() {
					pluginExecutionCounter += 1;
				}
			},
			() => {
				pluginExecutionCounter += 1;
			}
		]
	}
};
