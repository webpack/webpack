// One module in chunks at two depths: each needs its own `../` path to the same chunk,
// which only a stand-in can carry — and here none may be reserved.
export const load = () =>
	Promise.all([
		import(/* webpackChunkName: "flat" */ "./depths-flat"),
		import(/* webpackChunkName: "nested/deep" */ "./depths-deep")
	]);
