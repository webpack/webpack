class Foo {
  static #x = 1;
  static #m = function() {};

  static test() {
    const o = { Foo: Foo };
    return [
      o?.Foo.#x,
      o?.Foo.#x.toFixed,
      o?.Foo.#x.toFixed(2),
      o?.Foo.#m(),
    ];
  }
}
