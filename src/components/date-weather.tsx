"use client";

import { useEffect, useState } from "react";

type Weather = { city: string; temp: number; text: string };

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

async function fetchWeather(path: string): Promise<Weather | null> {
  try {
    const res = await fetch(path);
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

export function DateWeather() {
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    let cancelled = false;
    const apply = (w: Weather | null) => { if (!cancelled && w) setWeather(w); };

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      // 优先浏览器定位；拒绝/超时/失败则回落到配置城市
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const w = await fetchWeather(
            `/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          if (w) apply(w);
          else apply(await fetchWeather("/api/weather"));
        },
        async () => apply(await fetchWeather("/api/weather")),
        { timeout: 5000, maximumAge: 30 * 60 * 1000 }
      );
    } else {
      fetchWeather("/api/weather").then(apply);
    }
    return () => { cancelled = true; };
  }, []);

  const now = new Date();
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日 周${WEEKDAYS[now.getDay()]}`;

  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span className="font-mono-cn font-semibold text-ink">{dateStr}</span>
      {weather && (
        <span className="text-ink-soft text-xs">
          {weather.city} · {weather.text} {weather.temp}°C
        </span>
      )}
    </div>
  );
}
