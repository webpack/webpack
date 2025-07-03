import { dir, dir2, file } from './cjs/file.js'

it("should generate correct __dirname", () => {
	expect(dir).toMatch(/[\\/]node-globals$/);
	expect(dir2).toMatch(/[\\/]node-globals\/$/);
});

it("should generate correct __filename", () => {
	expect(file).toMatch(/[\\/]main.mjs$/);
});
