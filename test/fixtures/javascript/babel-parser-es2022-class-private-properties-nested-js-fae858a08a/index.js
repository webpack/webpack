class Point {
  #x = 1;
  #y = 2;

  constructor(x = 0, y = 0) {
    this.#x = +x;
    this.#y = +y;

    this.foo = class {
      #x = 1;
      #y = 2;

      constructor(x = 0, y = 0) {
        this.#x = +x;
        this.#y = +y;
      }

      get x() { return this.#x }
      set x(value) { this.#x = +value }

      get y() { return this.#y }
      set y(value) { this.#y = +value }

      equals(p) { return this.#x === p.#x && this.#y === p.#y }

      toString() { return `Point<${ this.#x },${ this.#y }>` }
    };
  }

  get x() { return this.#x }
  set x(value) { this.#x = +value }

  get y() { return this.#y }
  set y(value) { this.#y = +value }

  equals(p) { return this.#x === p.#x && this.#y === p.#y }

  toString() { return `Point<${ this.#x },${ this.#y }>` }
}
