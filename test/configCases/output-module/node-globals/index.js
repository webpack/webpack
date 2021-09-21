import { dir, file } from './cjs/file.js'

it("should generate correct __dirname", () => {
	const match = dir.match(/[\\/][^\\/]+[\\/]$/);
	expect(match && match[0]).toMatch(/[\\/]node-globals[\\/]/);
});

it("should generate correct __filename", () => {
	const match = file.match(/[\\/][^\\/]+$/);
	expect(match && match[0]).toMatch(/[\\/]main.mjs$/);
});
