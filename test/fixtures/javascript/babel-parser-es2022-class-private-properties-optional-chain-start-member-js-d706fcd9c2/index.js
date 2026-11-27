class Foo {
  static #x = 1;

  static test() {
    return Foo?.#x.toFixed;
  }
}
