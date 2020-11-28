import module from "./module";

let counter = 1;

self.onmessage = async ({ data: msg }) => {
	switch (msg) {
		case "next":
			await import.meta.webpackHot.check(true);
		case "test":
			if (module === 42 && counter === 4) {
				self.postMessage("done");
				break;
			}
			if (module !== counter)
				throw new Error(`module (${module}) should be ${counter}`);
			counter++;
			self.postMessage("next");
			break;
		default:
			throw new Error("Unexpected message");
	}
};

import.meta.webpackHot.accept("./module");
