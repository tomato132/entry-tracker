import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { weatherText } from "@/lib/weather";

async function fetchWeather(lat: number, lon: number) {
  const wRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`,
    { next: { revalidate: 1800 } }
  );
  if (!wRes.ok) throw new Error("weather failed");
  return wRes.json();
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  const hasCoords =
    sp.get("lat") !== null && sp.get("lon") !== null &&
    Number.isFinite(lat) && Number.isFinite(lon) &&
    Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

  try {
    if (hasCoords) {
      // 定位模式：经纬度直接查天气 + 逆地理编码取城市名
      const [w, geo] = await Promise.all([
        fetchWeather(lat, lon),
        fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`
        ).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      return NextResponse.json({
        city: geo?.city || geo?.locality || "当前位置",
        temp: Math.round(w.current.temperature_2m),
        text: weatherText(w.current.weather_code),
      });
    }

    // 城市名模式（默认北京，可用 WEATHER_CITY 配置）
    const city = process.env.WEATHER_CITY ?? "北京";
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh`,
      { next: { revalidate: 86400 } }
    );
    if (!geoRes.ok) throw new Error("geo failed");
    const geo = await geoRes.json();
    const loc = geo.results?.[0];
    if (!loc) return NextResponse.json({ error: `找不到城市：${city}` }, { status: 404 });

    const w = await fetchWeather(loc.latitude, loc.longitude);
    return NextResponse.json({
      city: loc.name ?? city,
      temp: Math.round(w.current.temperature_2m),
      text: weatherText(w.current.weather_code),
    });
  } catch {
    return NextResponse.json({ error: "天气服务暂时不可用" }, { status: 502 });
  }
}
