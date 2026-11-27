function* foo() {
  class C {
    static foo() {}
    static {
      yield 42;
    }
  }
}
