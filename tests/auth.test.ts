import { describe, expect, it } from "vitest";
import { authorizeAdmin, createAdminSession, validCredentials } from "../src/auth";
import type { Env } from "../src/types";

const env = {
  ADMIN_EMAIL: "podroz.martyna@gmail.com",
  ADMIN_PASSWORD: "correct horse battery staple",
  SESSION_SECRET: "a-test-session-secret-that-is-longer-than-32-characters"
} as Env;

describe("admin authentication", () => {
  it("accepts only the configured email and password", async () => {
    await expect(validCredentials(" PODROZ.MARTYNA@gmail.com ", "correct horse battery staple", env)).resolves.toBe(true);
    await expect(validCredentials("podroz.martyna@gmail.com", "wrong password", env)).resolves.toBe(false);
    await expect(validCredentials("other@example.com", "correct horse battery staple", env)).resolves.toBe(false);
  });

  it("creates a signed cookie accepted by the authorization check", async () => {
    const setCookie = await createAdminSession(env);
    expect(setCookie).toContain("HttpOnly; Secure; SameSite=Strict");
    const cookie = setCookie?.split(";", 1)[0];
    const request = new Request("https://martynapodroze.pl/admin/wyjazdy/", {
      headers: { Cookie: cookie ?? "" }
    });
    await expect(authorizeAdmin(request, env)).resolves.toBe(true);
  });

  it("rejects a modified session cookie", async () => {
    const setCookie = await createAdminSession(env);
    const cookie = setCookie?.split(";", 1)[0] ?? "";
    const request = new Request("https://martynapodroze.pl/admin/wyjazdy/", {
      headers: { Cookie: `${cookie}tampered` }
    });
    await expect(authorizeAdmin(request, env)).resolves.toBe(false);
  });
});
