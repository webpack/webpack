class Bar{
  @outer(
    @classDec class { 
      @inner 
      innerMethod() {} 
    }
  )
  outerMethod() {}
}
