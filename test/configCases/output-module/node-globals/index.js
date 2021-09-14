import { dir, file } from './cjs/file.js'

it("should generate correct __dirname", () => {
	const last = dir.lastIndexOf("/")
	expect(dir.slice(dir.lastIndexOf("/", last - 1), last)).toBe("/node-globals");
});

it("should generate correct __filename", () => {
	expect(file.slice(file.lastIndexOf("/"))).toBe("/bundle0.mjs");
});
