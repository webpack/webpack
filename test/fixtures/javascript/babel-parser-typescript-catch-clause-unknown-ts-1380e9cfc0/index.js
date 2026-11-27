try {} catch (ex) {}
try {} catch (ex: unknown) {}
try {} catch (ex: any) {}

// The following can't be error'd at parse time
try {} catch (ex: A) {}
try {} catch (ex: Error) {}
try {} catch (ex: string) {}
try {} catch (ex: string | number) {}
