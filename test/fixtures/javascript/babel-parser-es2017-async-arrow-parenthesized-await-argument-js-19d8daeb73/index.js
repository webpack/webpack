async function f() {
  await (async () => {});
  await (async x => {});
}
