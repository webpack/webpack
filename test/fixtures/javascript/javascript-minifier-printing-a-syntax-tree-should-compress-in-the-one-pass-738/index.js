function a() { const [unused, used] = g(); return used; }
function b() { const [unused, used] = [1, f()]; return used; }
function c() { const [unused, , used] = [1, 2, 3]; return used; }
