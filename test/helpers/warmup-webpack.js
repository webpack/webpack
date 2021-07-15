describe("warmup", () => {
	it("should warmup webpack", done => {
		let webpack = require("../../");
		let END = new Error("end warmup");
		webpack(
			{
				entry: "data:text/javascript,import 'data:text/javascript,'",
				plugins: [
					c =>
						c.hooks.emit.tap("Warmup", () => {
							throw END;
						})
				]
			},
			err => {
				webpack = undefined;
				try {
					expect(err).toBe(END);
					done();
				} catch (e) {
					done(e);
				}
			}
		);
	}, 300000);
});
