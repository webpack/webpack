export default fn => {
	self.onmessage = async ({ data: msg }) => {
		try {
			switch (msg) {
				case "next":
					if (!(await import.meta.webpackHot.check(true)))
						throw new Error("No update found");
					await fn();
					self.postMessage("next");
					break;
				default:
					throw new Error("Unexpected message");
			}
		} catch (e) {
			self.postMessage("error: " + e.stack);
		}
	};
};
