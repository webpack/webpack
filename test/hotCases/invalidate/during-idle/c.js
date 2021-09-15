export function invalidate() {
	module.hot.invalidate();
}

export const value = module.hot.data ? module.hot.data.value : {};

module.hot.dispose(data => {
	data.value = value;
});

module.hot.accept();
