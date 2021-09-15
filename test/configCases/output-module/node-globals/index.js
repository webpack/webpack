import { dir, file } from './cjs/file.js'

it("should generate correct __dirname", () => {
	expect(dir.slice(dir.lastIndexOf("/", dir.length - 2))).toBe("/node-globals/");
});

it("should generate correct __filename", () => {
	expect(file.slice(file.lastIndexOf("/"))).toBe("/main.mjs");
});
