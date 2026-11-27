async function f() {
  {
    await using f = foo(), f = foo();
  }
  {
    await using g = foo();
    await using g = foo();
  }
}
