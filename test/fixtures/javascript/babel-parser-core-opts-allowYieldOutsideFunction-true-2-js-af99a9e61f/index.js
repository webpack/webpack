async function fn() {
  yield + 1; // this is a sum between "yield" and 1
  await + 1; // this is awaiting "+1"
}
