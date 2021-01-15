class ThrowsExceptionInRender {
	apply(compiler) {
		compiler.hooks.compilation.tap("ThrowsException", compilation => {
			compilation.mainTemplate.hooks.requireExtensions.tap(
				"ThrowsException",
				() => {
					throw new Error("Test exception");
				}
			);
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [new ThrowsExceptionInRender()]
};
