"use strict";

// Stub electron built-in modules so the externalized import/require resolves
module.exports = {
	modules: {
		electron: { marker: "electron" },
		app: { marker: "app" },
		shell: { marker: "shell" }
	}
};
