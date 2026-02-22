import bytes from "./file.bin" with { type: "bytes" };

it("should work", () => {
	expect(bytes).toBeInstanceOf(Uint8Array);
	expect(bytes.length).toBe(8);
	expect(Array.from(bytes)).toEqual([0, 0x61, 0x73, 0x6d, 1, 2, 3, 4]);
});
