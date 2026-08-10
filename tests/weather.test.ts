import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/current-user", () => ({ getCurrentUser: vi.fn() }));

import { GET } from "@/app/api/weather/route";
import { weatherText } from "@/lib/weather";
import { getCurrentUser } from "@/lib/current-user";

const me = { id: "u1", email: "a@b.com", role: "USER" as const };
const user = vi.mocked(getCurrentUser);

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  delete process.env.WEATHER_CITY;
});

describe("weatherText", () => {
  it("常见天气码映射", () => {
    expect(weatherText(0)).toBe("晴");
    expect(weatherText(2)).toBe("多云");
    expect(weatherText(61)).toBe("雨");
    expect(weatherText(95)).toBe("雷阵雨");
  });
});

describe("GET /api/weather", () => {
  it("未登录 401", async () => {
    user.mockResolvedValue(null);
    const res = await GET(new Request("http://x/api/weather"));
    expect(res.status).toBe(401);
  });

  it("正常返回城市/温度/天气", async () => {
    user.mockResolvedValue(me);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        results: [{ name: "北京市", latitude: 39.9, longitude: 116.4 }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        current: { temperature_2m: 26.4, weather_code: 1 },
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(new Request("http://x/api/weather"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ city: "北京市", temp: 26, text: "多云" });
    // 默认城市北京
    expect(String(fetchMock.mock.calls[0][0])).toContain(encodeURIComponent("北京"));
  });

  it("定位模式：经纬度直查天气并逆地理出城市", async () => {
    user.mockResolvedValue(me);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        current: { temperature_2m: 31.2, weather_code: 0 },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ city: "杭州市" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(new Request("http://x/api/weather?lat=30.25&lon=120.17"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ city: "杭州市", temp: 31, text: "晴" });
    // 第一次调用直接带经纬度查天气，不做正向地理编码
    expect(String(fetchMock.mock.calls[0][0])).toContain("latitude=30.25");
  });

  it("定位模式：逆地理失败时城市显示「当前位置」", async () => {
    user.mockResolvedValue(me);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        current: { temperature_2m: 20, weather_code: 61 },
      }), { status: 200 }))
      .mockRejectedValueOnce(new Error("reverse geo down")));
    const res = await GET(new Request("http://x/api/weather?lat=30&lon=120"));
    const body = await res.json();
    expect(body.city).toBe("当前位置");
    expect(body.text).toBe("雨");
  });

  it("城市不存在返回 404", async () => {
    user.mockResolvedValue(me);
    process.env.WEATHER_CITY = "不存在的城市xyz";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ results: [] }), { status: 200 })
    ));
    const res = await GET(new Request("http://x/api/weather"));
    expect(res.status).toBe(404);
  });

  it("天气服务故障返回 502", async () => {
    user.mockResolvedValue(me);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const res = await GET(new Request("http://x/api/weather"));
    expect(res.status).toBe(502);
  });
});
