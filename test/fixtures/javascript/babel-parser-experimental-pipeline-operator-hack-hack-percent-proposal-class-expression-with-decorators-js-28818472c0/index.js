value |> new (
  @classDecorator
  class Thing {
    @methodDecorator
    method () {
      return % + this.property;
    }
  }
);
