import { describe, expect, test, vi } from "vitest";
import {
  SUPABASE_URL,
  cleanUsername,
  parseShelfAuthHash,
  revokeShelfSession,
  usernameFormatError,
} from "../../app/auth-client";

describe("account auth client", () => {
  test("normalizes and validates public usernames", () => {
    expect(cleanUsername("  Book.Lover_92 ")).toBe("book.lover_92");
    expect(usernameFormatError("ab")).toBe("Username must be 3–24 characters.");
    expect(usernameFormatError("bad name")).toBe("Use letters, numbers, underscores, or periods only.");
    expect(usernameFormatError("bad__name")).toBe("Avoid repeated periods or underscores.");
    expect(usernameFormatError("book.lover_92")).toBe("");
  });

  test("reads confirmed sessions and errors from Supabase callback hashes", () => {
    expect(parseShelfAuthHash("#access_token=access-123&refresh_token=refresh-456")).toEqual({
      session: { access_token: "access-123", refresh_token: "refresh-456" },
    });
    expect(parseShelfAuthHash("#error=access_denied&error_description=Confirmation+expired")).toEqual({
      error: "Confirmation expired",
    });
    expect(parseShelfAuthHash("")).toBeNull();
  });

  test("revokes only the current Supabase session on sign out", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
    await revokeShelfSession("access-123", fetcher);

    expect(fetcher).toHaveBeenCalledWith(`${SUPABASE_URL}/auth/v1/logout?scope=local`, {
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer access-123" }),
    });
  });

  test("allows local cleanup when Supabase already considers the session invalid", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 401 })) as unknown as typeof fetch;
    await expect(revokeShelfSession("expired", fetcher)).resolves.toBeUndefined();
  });
});
