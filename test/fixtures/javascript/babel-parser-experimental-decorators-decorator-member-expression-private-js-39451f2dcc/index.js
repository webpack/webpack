class C {
  static decFactory = () => () => {}
  static #decFactory = () => () => {}
  static dec = C.decFactory();
  static #dec = C.#decFactory();
  static self = C;
  static #self = C;
  @C.#dec @C.self.#dec @C.#self.dec @C.#self.#dec
  @C.#decFactory() @C.self.#decFactory() @C.#self.decFactory() @C.#self.#decFactory()
  m() {}
}
