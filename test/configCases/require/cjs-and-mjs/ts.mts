import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { foo } = require('./foo.cjs');

it("should work", () => {
	expect(foo).toBe(1);
});
