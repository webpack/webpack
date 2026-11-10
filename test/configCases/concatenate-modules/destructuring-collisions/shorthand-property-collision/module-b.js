const shared = "from module-b";

export const asShorthand = { shared };
export const asComputed = { [shared]: shared };
export const asMethod = {
	shared() {
		return shared;
	}
};
export const { shared: renamedOut } = { shared };
