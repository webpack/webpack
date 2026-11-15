const a = require("./a");
const b = require("./b");

it("runs a queued threaded module while another loader waits on it", () => {
	expect(a).toBe("a");
	expect(b).toBe("b");
});
