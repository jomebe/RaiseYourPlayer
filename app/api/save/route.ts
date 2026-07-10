import { deleteRemoteSave, readRemoteSave, writeRemoteSave } from "@/db/game-saves";
import { isGameSave } from "@/src/game/save/validation";

const PROFILE_ID = /^[a-f0-9-]{36}$/i;
const MAX_SAVE_BYTES = 1_000_000;

function profileIdFrom(request: Request): string | null {
  const value = new URL(request.url).searchParams.get("profileId");
  return value && PROFILE_ID.test(value) ? value : null;
}

export async function GET(request: Request) {
  try {
    const profileId = profileIdFrom(request);
    if (!profileId) return Response.json({ error: "올바른 프로필 ID가 필요합니다." }, { status: 400 });
    const raw = await readRemoteSave(profileId);
    if (!raw) return Response.json({ save: null });
    const value: unknown = JSON.parse(raw);
    if (!isGameSave(value)) return Response.json({ error: "원격 저장 데이터가 손상되었습니다." }, { status: 422 });
    return Response.json({ save: value });
  } catch (error) {
    console.error(JSON.stringify({ message: "save read failed", error: error instanceof Error ? error.message : String(error) }));
    return Response.json({ error: "원격 저장 데이터를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const profileId = profileIdFrom(request);
    if (!profileId) return Response.json({ error: "올바른 프로필 ID가 필요합니다." }, { status: 400 });
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MAX_SAVE_BYTES) return Response.json({ error: "저장 데이터가 너무 큽니다." }, { status: 413 });
    const body: unknown = await request.json();
    if (!isGameSave(body)) return Response.json({ error: "저장 데이터 형식이 올바르지 않습니다." }, { status: 400 });
    const raw = JSON.stringify(body);
    if (new TextEncoder().encode(raw).byteLength > MAX_SAVE_BYTES) return Response.json({ error: "저장 데이터가 너무 큽니다." }, { status: 413 });
    await writeRemoteSave(profileId, raw, String(body.version));
    return Response.json({ saved: true, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error(JSON.stringify({ message: "save write failed", error: error instanceof Error ? error.message : String(error) }));
    return Response.json({ error: "원격 저장에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const profileId = profileIdFrom(request);
    if (!profileId) return Response.json({ error: "올바른 프로필 ID가 필요합니다." }, { status: 400 });
    await deleteRemoteSave(profileId);
    return Response.json({ deleted: true });
  } catch (error) {
    console.error(JSON.stringify({ message: "save delete failed", error: error instanceof Error ? error.message : String(error) }));
    return Response.json({ error: "원격 저장 초기화에 실패했습니다." }, { status: 500 });
  }
}
