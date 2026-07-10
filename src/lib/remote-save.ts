import type { GameSave } from "../game/types";
import { isGameSave } from "../game/save/validation";

const endpoint = (profileId: string) =>
  `/api/save?profileId=${encodeURIComponent(profileId)}`;

async function jsonOrError(response: Response): Promise<unknown> {
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "원격 저장 요청이 실패했습니다.";
    throw new Error(message);
  }
  return payload;
}

export async function loadRemoteSave(
  profileId: string,
): Promise<GameSave | null> {
  const payload = await jsonOrError(
    await fetch(endpoint(profileId), { cache: "no-store" }),
  );
  if (!payload || typeof payload !== "object" || !("save" in payload))
    throw new Error("원격 저장 응답이 올바르지 않습니다.");
  if (payload.save === null) return null;
  if (!isGameSave(payload.save))
    throw new Error("원격 저장 데이터가 손상되었습니다.");
  return payload.save;
}

export async function saveRemote(
  profileId: string,
  save: GameSave,
): Promise<void> {
  await jsonOrError(
    await fetch(endpoint(profileId), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(save),
    }),
  );
}

export async function deleteRemote(profileId: string): Promise<void> {
  await jsonOrError(await fetch(endpoint(profileId), { method: "DELETE" }));
}
