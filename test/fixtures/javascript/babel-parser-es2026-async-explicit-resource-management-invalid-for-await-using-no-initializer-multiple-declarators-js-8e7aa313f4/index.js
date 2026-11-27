async function f() {
  for (await using x = a, y of z);
}
