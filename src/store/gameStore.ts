"use client";

import { create } from "zustand";
import { createEmptySave } from "../game/engine/game";
import type { GameSave } from "../game/types";
import { deleteRemote, loadRemoteSave, saveRemote } from "../lib/remote-save";

const PROFILE_KEY = "raise-your-player-profile-id";

interface GameStore {
  game: GameSave | null;
  profileId: string | null;
  status: "idle" | "loading" | "ready" | "saving" | "error";
  error: string | null;
  lastSavedAt: string | null;
  initialize: () => Promise<void>;
  commit: (next: GameSave) => Promise<void>;
  manualSave: () => Promise<void>;
  resetSave: () => Promise<void>;
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: null,
  profileId: null,
  status: "idle",
  error: null,
  lastSavedAt: null,
  initialize: async () => {
    if (get().status === "loading") return;
    set({ status: "loading", error: null });
    try {
      let profileId = localStorage.getItem(PROFILE_KEY);
      if (!profileId) {
        profileId = crypto.randomUUID();
        localStorage.setItem(PROFILE_KEY, profileId);
      }
      let game = await loadRemoteSave(profileId);
      if (!game) {
        game = createEmptySave();
        await saveRemote(profileId, game);
      }
      set({ game, profileId, status: "ready", lastSavedAt: game.updatedAt });
    } catch (error) {
      set({
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "원격 저장소에 연결하지 못했습니다.",
      });
    }
  },
  commit: async (next) => {
    const profileId = get().profileId;
    if (!profileId) return;
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    set({ game: stamped, status: "saving", error: null });
    try {
      await saveRemote(profileId, stamped);
      if (get().game?.updatedAt === stamped.updatedAt)
        set({ status: "ready", lastSavedAt: stamped.updatedAt });
    } catch (error) {
      set({
        status: "error",
        error:
          error instanceof Error ? error.message : "자동 저장에 실패했습니다.",
      });
    }
  },
  manualSave: async () => {
    const { game, profileId } = get();
    if (!game || !profileId) return;
    set({ status: "saving", error: null });
    try {
      await saveRemote(profileId, game);
      set({ status: "ready", lastSavedAt: new Date().toISOString() });
    } catch (error) {
      set({
        status: "error",
        error:
          error instanceof Error ? error.message : "수동 저장에 실패했습니다.",
      });
    }
  },
  resetSave: async () => {
    const profileId = get().profileId;
    if (!profileId) return;
    set({ status: "saving", error: null });
    try {
      await deleteRemote(profileId);
      const game = createEmptySave();
      await saveRemote(profileId, game);
      set({ game, status: "ready", lastSavedAt: game.updatedAt });
    } catch (error) {
      set({
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "저장 초기화에 실패했습니다.",
      });
    }
  },
}));
