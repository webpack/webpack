self.loadLazyModule = () => import("./module");
self.applyUpdate = () =>
	module.hot.check(true).then((updatedModules) => {
		if (!updatedModules) {
			throw new Error("No update available");
		}
		return updatedModules;
	});

if (module.hot) {
	module.hot.accept();
}
