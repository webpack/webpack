export let total = 0;

for await (const item of [1, 2]) total += item;

await null;
