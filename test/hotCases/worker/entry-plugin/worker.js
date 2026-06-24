import value from "./module";

let counter = 1;

self.onmessage = async ({ data: msg }) => {
	try {
		switch (msg) {
			case "next":
				// Update is driven by the WorkerEntryPlugin-injected client.
				await self.__checkForUpdate();
			case "test":
				if (value === 42 && counter === 4) {
					self.postMessage("done");
					break;
				}
				if (value !== counter)
					throw new Error(`value (${value}) should be ${counter}`);
				counter++;
				self.postMessage("next");
				break;
			default:
				throw new Error("Unexpected message");
		}
	} catch (e) {
		self.postMessage("error: " + e.stack);
	}
};

import.meta.webpackHot.accept("./module");
