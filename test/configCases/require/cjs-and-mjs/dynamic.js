import { createRequire } from 'node:module';

const require = createRequire ? createRequire(import.meta.url) : undefined;

it("should work", () => {
	expect(typeof require).toBe("undefined");
});
