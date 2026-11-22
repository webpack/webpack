"use strict";

const {
	javascript: {
		syntax: {
			parser: { ParserPosition }
		}
	},
	sources: { RawSource },
	util: {
		serialization: { buffersSerializer }
	}
} = require("../../");

describe("registerExternalSerializer", () => {
	it("keeps a restored string RawSource readable after clearCache", async () => {
		const content = "export default 42;";
		const restored = /** @type {import("webpack-sources").RawSource} */ (
			await buffersSerializer.deserialize(
				await buffersSerializer.serialize(new RawSource(content), {}),
				{}
			)
		);
		// what a cached module meets when its code is generated again and the
		// eval devtool releases the copies, before stats read its size
		restored.source();
		restored.clearCache({ maps: false, source: true });
		expect(restored.size()).toBe(content.length);
		expect(restored.source()).toBe(content);
	});

	it("restores a ParserPosition as a ParserPosition", async () => {
		const restored = /** @type {InstanceType<typeof ParserPosition>} */ (
			await buffersSerializer.deserialize(
				await buffersSerializer.serialize(new ParserPosition(3, 7), {}),
				{}
			)
		);
		expect(restored).toBeInstanceOf(ParserPosition);
		expect(restored.offset(2)).toEqual(new ParserPosition(3, 9));
	});
});
