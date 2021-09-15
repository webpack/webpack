export let currentTick = 0;
export const report = name => {
	entries.push(`${name} ${currentTick}`);
};
export let entries = [];
let running = false;
export const start = async () => {
	entries = [];
	running = true;
	currentTick = 0;
	while (running) {
		await 0;
		currentTick++;
	}
};
export const stop = () => {
	running = false;
	return entries;
};
