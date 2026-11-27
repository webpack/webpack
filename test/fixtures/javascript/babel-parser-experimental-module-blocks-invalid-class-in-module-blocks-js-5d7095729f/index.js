class B {
  #p() {
    module {
      class C { [this.#p]; }
    };
  }
}
