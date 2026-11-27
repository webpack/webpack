class B {
  #p() {
    module {
      class C {
        [this.#p];
        #p = 3;
      }
    };
  }
}
  