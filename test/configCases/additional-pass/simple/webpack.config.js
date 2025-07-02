/** @type {import("../../../../").WebpackPluginFunction} */
function testPlugin() {
	let counter = 1;
	this.hooks.compilation.tap("TestPlugin", compilation => {
		const nr = counter++;
		compilation.hooks.needAdditionalPass.tap("TestPlugin", () => {
			if (nr < 5) return true;
		});
	});
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [testPlugin]
};
