const process = require("./process");
const originalCwd = process.cwd;

process.cwd = () => `${originalCwd()}/provided`;

const nodePolyfills = {
	process
};

it("should not provide for a const require binding with the same name", () => {
	expect(nodePolyfills.process.cwd()).toBe("/cwd/provided");
});

export default nodePolyfills;
