class B {
  static foo() {}
}
class C extends B {
  static {
    this.bar = super.foo;
  }
}
