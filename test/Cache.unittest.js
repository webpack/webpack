"use strict";

const Cache = require("../lib/Cache");

describe("Cache", () => {
	it("calls callback once when multiple got handlers receive an error", (done) => {
		const cache = new Cache();
		cache.hooks.get.tapAsync(
			"DataReturner",
			(_identifier, _etag, gotHandlers, callback) => {
				gotHandlers.push((_result, done) => {
					done(new Error("first got handler error"));
				});
				gotHandlers.push((_result, done) => {
					done();
				});
				callback(undefined, "ok");
			}
		);

		let callbackCalls = 0;
		cache.get("id", null, (err, result) => {
			callbackCalls++;
			expect(callbackCalls).toBe(1);
			expect(err).toBeNull();
			expect(result).toBe("ok");
			done();
		});
	});
});
