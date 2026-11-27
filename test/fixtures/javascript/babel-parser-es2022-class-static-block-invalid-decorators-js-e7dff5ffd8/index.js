class C {
  static foo() {}
  @dec
  static {
    this.bar = this.foo;
  }
}
