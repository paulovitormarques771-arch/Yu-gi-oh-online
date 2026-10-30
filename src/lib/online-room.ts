const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 6-character shareable room code without ambiguous characters (0/O, 1/I). */
export function newRoomCode(random: () => number = Math.random) {
  return Array.from({ length: 6 }, () => ALPHABET[Math.floor(random() * ALPHABET.length)]).join("");
}

export function isRoomCode(value: string) {
  return /^[A-HJ-NP-Z2-9]{6}$/.test(value);
}
