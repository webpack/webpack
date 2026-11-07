"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	const callback = this.async();

	setTimeout(() => {
		this.loadModule("./b", (error) => {
			if (error) {
				callback(error);
				return;
			}
			callback(null, "module.exports = 'a';");
		});
	}, 100);
};
