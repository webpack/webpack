import fs from 'fs'

it("require should use `node-commonjs` when externalsPresets.node is true", () => {
	const nodeCommonjsFs = require("node-commonjs-fs");
	expect(nodeCommonjsFs).toBe(fs);
});
