declare namespace webpack {
	interface HotData {
		count: number;
	}
}

module.hot.dispose((data) => {
	data.count = 1;
});
const count: number = module.hot.data ? module.hot.data.count : 0;
// @ts-expect-error `data` is undefined on a module's first evaluation
module.hot.data.count;
// @ts-expect-error a field no declaration names
module.hot.dispose((data) => data.missing);
