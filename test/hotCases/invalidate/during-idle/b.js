export function invalidate() {
	module.hot.invalidate();
}

export const value = {};

module.hot.accept();
