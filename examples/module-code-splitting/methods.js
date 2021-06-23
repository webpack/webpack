export const resetCounter = async () => {
	(await import("./counter")).reset();
};

export const print = value => console.log(value);
