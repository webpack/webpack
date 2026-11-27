async () => {
  class C {
    // here await is an identifier reference
    p = await + 42;
  }
}
