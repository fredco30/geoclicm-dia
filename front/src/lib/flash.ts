/**
 * Message de confirmation éphémère du back-office (« Modifications
 * enregistrées »). Stocké en sessionStorage pour survivre à la redirection
 * qui suit souvent un enregistrement ; affiché par <FlashToast />.
 */
const KEY = "gm_flash";
export const FLASH_EVENT = "gm:flash";

export function flash(message: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, message);
  } catch {
    /* sessionStorage indisponible : l'événement suffit */
  }
  window.dispatchEvent(new CustomEvent(FLASH_EVENT, { detail: message }));
}

export function takeFlash(): string | null {
  try {
    const message = window.sessionStorage.getItem(KEY);
    if (message) window.sessionStorage.removeItem(KEY);
    return message;
  } catch {
    return null;
  }
}
