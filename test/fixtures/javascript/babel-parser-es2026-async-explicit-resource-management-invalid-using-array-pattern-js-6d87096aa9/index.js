async function f() {
  await using [ foo ] = f();
}
