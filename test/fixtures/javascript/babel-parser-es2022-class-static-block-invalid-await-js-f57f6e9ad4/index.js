async function foo() {
  class C {
    static foo() {}
    static {
      await 42;
    }
  }
}
