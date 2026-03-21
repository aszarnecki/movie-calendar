const ADMIN_PIN  = import.meta.env.VITE_PIN_ADMIN;
const VIEWER_PIN = import.meta.env.VITE_PIN_VIEWER;

export function login(pin) {
  if (pin === ADMIN_PIN)  { sessionStorage.setItem("role", "admin");  return "admin"; }
  if (pin === VIEWER_PIN) { sessionStorage.setItem("role", "viewer"); return "viewer"; }
  return null;
}
export function getRole()  { return sessionStorage.getItem("role"); }
export function logout()   { sessionStorage.removeItem("role"); }
