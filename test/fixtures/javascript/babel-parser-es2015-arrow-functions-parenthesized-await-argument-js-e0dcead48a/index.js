async function f() {
  await (() => {});
  await (x => {});
}
