class Foo {
  static #m = function() {};

  static test() {
    return Foo?.#m();
  }
}
