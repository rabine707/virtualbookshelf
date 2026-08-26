import { afterEach, describe, expect, test, vi } from "vitest";
import { enforceApiRateLimit } from "../../lib/rate-limit";

describe("API rate limiting", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  test("applies the shared limiter to cover downloads", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      allowed: false,
      retry_after_seconds: 17,
    }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await enforceApiRateLimit(new Request(
      "https://shelfoffame.example/api/cover-download?url=https%3A%2F%2Fexample.com%2Fcover.jpg",
      { headers: { "x-forwarded-for": "203.0.113.8" } },
    ));

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("17");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      p_limit: 30,
      p_window_seconds: 60,
    });
  });
});
