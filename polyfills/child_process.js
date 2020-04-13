export function spawn(bin, args, opts) {
	return Deno.run([bin, ...args], opts);
}
