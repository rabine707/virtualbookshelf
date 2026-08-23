import { isExplicitCuratorUpload, type DeletableSpine } from "../../../../../lib/curator-spine-delete";

const config = () => ({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "https://vrkuimrfdkejfhpxlwlf.supabase.co",
  key: process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "",
});
const serviceHeaders = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}` });

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { url, key } = config();
  if (!key) return Response.json({ error: "Spine deletion is not configured." }, { status: 503 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return Response.json({ error: "Sign in with a curator account." }, { status: 401 });

  const userResponse = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  const user = userResponse.ok ? await userResponse.json() as { id?: string } : null;
  if (!user?.id) return Response.json({ error: "Your session has expired." }, { status: 401 });

  const profileResponse = await fetch(`${url}/rest/v1/profiles?select=trusted_curator&id=eq.${encodeURIComponent(user.id)}&limit=1`, { headers: serviceHeaders(key), cache: "no-store" });
  const profiles = profileResponse.ok ? await profileResponse.json() as Array<{ trusted_curator?: boolean }> : [];
  if (!profiles[0]?.trusted_curator) return Response.json({ error: "Only curator/admin accounts can delete uploaded spines." }, { status: 403 });

  const { id } = await context.params;
  const spineResponse = await fetch(`${url}/rest/v1/spines?select=id,storage_path,model,contributed_by&id=eq.${encodeURIComponent(id)}&limit=1`, { headers: serviceHeaders(key), cache: "no-store" });
  const spines = spineResponse.ok ? await spineResponse.json() as DeletableSpine[] : [];
  const spine = spines[0];
  if (!spine) return Response.json({ error: "That spine no longer exists." }, { status: 404 });

  const contributorResponse = spine.contributed_by ? await fetch(`${url}/rest/v1/profiles?select=trusted_curator&id=eq.${encodeURIComponent(spine.contributed_by)}&limit=1`, { headers: serviceHeaders(key), cache: "no-store" }) : null;
  const contributors = contributorResponse?.ok ? await contributorResponse.json() as Array<{ trusted_curator?: boolean }> : [];
  if (!isExplicitCuratorUpload(spine, contributors[0]?.trusted_curator === true)) {
    return Response.json({ error: "Default, generated, and fallback spine assets are protected." }, { status: 409 });
  }

  const recordResponse = await fetch(`${url}/rest/v1/spines?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { ...serviceHeaders(key), Prefer: "return=representation" } });
  const deleted = recordResponse.ok ? await recordResponse.json() as DeletableSpine[] : [];
  if (!recordResponse.ok || deleted[0]?.id !== id) return Response.json({ error: "Could not delete the spine record." }, { status: 502 });

  const assetResponse = await fetch(`${url}/storage/v1/object/spines/${spine.storage_path!.split("/").map(encodeURIComponent).join("/")}`, { method: "DELETE", headers: serviceHeaders(key) });
  if (!assetResponse.ok && assetResponse.status !== 404) return Response.json({ error: "The record was deleted, but its stored image could not be removed." }, { status: 502 });
  return Response.json({ deleted: true, id });
}

