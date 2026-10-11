import { describe, expect, it } from "vitest";
import { assertSafeUrl, isPrivateIp, SsrfError } from "./ssrf";

describe("ssrf protection", () => {
  it("detects private and cloud metadata IPv4 addresses", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("172.16.0.1")).toBe(true);
    expect(isPrivateIp("169.254.169.254")).toBe(true);
    expect(isPrivateIp("0.0.0.0")).toBe(true);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("1.1.1.1")).toBe(false);
  });

  it("detects private IPv6 addresses", () => {
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("fe80::1")).toBe(true);
    expect(isPrivateIp("fc00::1")).toBe(true);
    expect(isPrivateIp("2606:4700:4700::1111")).toBe(false);
  });

  it("rejects non-http protocols and credentials", async () => {
    await expect(assertSafeUrl("ftp://example.com/file")).rejects.toThrow(SsrfError);
    await expect(assertSafeUrl("file:///etc/passwd")).rejects.toThrow(SsrfError);
    await expect(assertSafeUrl("javascript:alert(1)")).rejects.toThrow(SsrfError);
    await expect(assertSafeUrl("https://admin:pass@example.com/item")).rejects.toThrow(SsrfError);
  });

  it("rejects private IP literals and non-standard ports", async () => {
    await expect(assertSafeUrl("http://127.0.0.1/admin")).rejects.toThrow(SsrfError);
    await expect(assertSafeUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrow(SsrfError);
    await expect(assertSafeUrl("https://example.com:8443/item")).rejects.toThrow(SsrfError);
  });
});
