// Various mutation forms on exported `let` must all stay observable as live bindings
export let viaAssign = 1;
export let viaCompound = 1;
export let viaUpdate = 1;

export function mutateAll() {
	viaAssign = 10;
	viaCompound += 5;
	viaUpdate++;
}
