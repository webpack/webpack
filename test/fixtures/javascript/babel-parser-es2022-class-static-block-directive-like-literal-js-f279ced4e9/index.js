class C {
  static foo() {}
  static {
    "use strict"; // will not be parsed as directives
    this.bar = this.foo;
  }
}
