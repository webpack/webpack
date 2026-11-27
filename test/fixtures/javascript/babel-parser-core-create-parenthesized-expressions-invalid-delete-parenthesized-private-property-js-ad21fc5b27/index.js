class C {
  #x;
  m() {
    delete (this.#x);
    delete ((this.#x));
    delete (a?.#x);
  }
}
