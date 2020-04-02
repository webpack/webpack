import {exportDefaultUsed} from './package/script';

it("should load module correctly", () => {
	require('./module');
});

it("default export should be unused", () => {
	expect(exportDefaultUsed).toBe(false)
});
