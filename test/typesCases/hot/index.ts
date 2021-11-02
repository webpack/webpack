module.hot.status();
module.hot.accept(() => { module.hot.data; });
module.hot.accept((err, { moduleId, module }) => {});
module.hot.accept("1", () => {}, (err, { moduleId, dependencyId }) => {});
module.hot.accept(["1", "2"], () => {}, (err, { moduleId, dependencyId }) => {});
module.hot.decline();
module.hot.decline("a");
module.hot.decline(["1", "2"]);
module.hot.dispose(() => {});
module.hot.invalidate();
module.hot.addStatusHandler((status) => {});
module.hot.removeStatusHandler(() => {});
module.hot.check(true).then(() => {});
module.hot.apply({
	ignoreUnaccepted: true,
	ignoreDeclined: true,
	ignoreErrored: true,
}).then(() => {});
module.hot.apply().then(() => {});
