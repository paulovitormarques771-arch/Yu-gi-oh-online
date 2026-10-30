import { describe, expect, it } from "vitest";
import { isRoomCode, newRoomCode } from "@/lib/online-room";

describe("room codes", () => {
  it("generates a 6-character valid code", () => expect(isRoomCode(newRoomCode())).toBe(true));
  it("rejects the training room id", () => expect(isRoomCode("treino")).toBe(false));
  it("rejects ambiguous characters", () => expect(isRoomCode("ABCDE0")).toBe(false));
});
