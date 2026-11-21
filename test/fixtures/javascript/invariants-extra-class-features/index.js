class Counter {
  #value = 0;
  static #instances = 0;

  static {
    Counter.#instances++;
  }

  inc(step = 1) {
    this.#value += step;
    return this.#value;
  }

  get value() {
    return this.#value;
  }
}

export default new Counter().inc();
