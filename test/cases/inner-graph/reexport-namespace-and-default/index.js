import {exportDefaultUsed as export1} from './package/script';
import {exportDefaultUsed as export2} from './package/script2';

it("should load module correctly", () => {
	require('./module');
});

it("default export should be unused", () => {
	expect(export1).toBe(false);
	expect(export2).toBe(false);
});
