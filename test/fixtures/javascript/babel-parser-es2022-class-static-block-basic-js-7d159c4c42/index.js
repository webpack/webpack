class C {
  static foo() {}
  static {
    this.bar = this.foo;
  }
}
