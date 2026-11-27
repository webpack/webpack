class B {}
class C extends B {
  static foo() {}
  static {
    super();
  }
}
