import { supabase } from '../config/supabaseClient.js';

let inactivityTimer;

export const initInactivityTimeout = () => {
  const resetTimer = () => {
    clearTimeout(inactivityTimer);
    // 15 minutos en milisegundos (15 * 60 * 1000 = 900,000 ms)
    inactivityTimer = setTimeout(async () => {
      alert("Sesión finalizada por 15 minutos de inactividad.");
      await logout();
    }, 900000);
  };

  ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'].forEach(evt => {
    window.addEventListener(evt, resetTimer);
  });
  resetTimer();
};

export const logout = async () => {
  clearTimeout(inactivityTimer);
  await supabase.auth.signOut();
  window.location.reload();
};
