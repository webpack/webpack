"use strict";

/** @import webpackModule from "../../" */

describe("warmup", () => {
	it("should warmup webpack", (done) => {
		/** @type {typeof webpackModule | undefined} */
		let webpack = require("../../");

		const END = new Error("end warmup");
		webpack(
			{
				entry: "data:text/javascript,import 'data:text/javascript,'",
				plugins: [
					(c) =>
						c.hooks.emit.tap("Warmup", () => {
							throw END;
						})
				]
			},
			(err) => {
				webpack = undefined;
				try {
					expect(err).toBe(END);
					done();
				} catch (doneErr) {
					done(doneErr);
				}
			}
		);
	}, 300000);
});
