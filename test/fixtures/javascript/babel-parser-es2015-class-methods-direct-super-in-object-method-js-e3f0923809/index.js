Object.create({}, {
  foo: {
    get: function(){
      return super.foo;
    }
  }
});
