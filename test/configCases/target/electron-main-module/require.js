const electron = require("electron");
const app = require("app");
const shell = require("shell");

it("should externalize required electron built-in modules as node-commonjs", () => {
	expect(electron.marker).toBe("electron");
	expect(app.marker).toBe("app");
	expect(shell.marker).toBe("shell");
});
