import * as electron from "electron";
import * as app from "app";
import * as shell from "shell";

it("should externalize electron built-in modules and resolve them at runtime", () => {
	// `electron` and `shell` are available in every electron context, `app` only in main
	expect(electron.marker).toBe("electron");
	expect(app.marker).toBe("app");
	expect(shell.marker).toBe("shell");
});
