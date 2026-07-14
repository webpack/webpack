async function* gen() {
	yield 1;
	yield 2;
}
let total = 0;
for await (const x of gen()) total += x;
export const sum = total;
