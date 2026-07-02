"use client";

import type { WeatherSnapshot } from "./types";

/**
 * Weather via Open-Meteo — completely free, no API key.
 * Geocoding (city name -> lat/lon) also via Open-Meteo's free geocoding API.
 */

const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light showers",
  81: "Showers",
  82: "Violent showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Severe thunderstorm",
};

export function describeWeatherCode(code: number): string {
  return WEATHER_DESCRIPTIONS[code] ?? "Unknown";
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  name: string;
}

export async function geocodeCity(city: string): Promise<GeoLocation | null> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city
    )}&count=1&language=en&format=json`
  );
  if (!res.ok) return null;
  const data = await res.json();
  const hit = data.results?.[0];
  if (!hit) return null;
  return {
    latitude: hit.latitude,
    longitude: hit.longitude,
    name: [hit.name, hit.country].filter(Boolean).join(", "),
  };
}

export function getBrowserLocation(): Promise<GeoLocation | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          name: "Your location",
        }),
      () => resolve(null),
      { timeout: 8000 }
    );
  });
}

export async function fetchTodayWeather(
  loc: GeoLocation
): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    daily:
      "temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max,wind_speed_10m_max,weather_code",
    timezone: "auto",
    forecast_days: "1",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
  const data = await res.json();
  const d = data.daily;
  return {
    tempMax: d.temperature_2m_max[0],
    tempMin: d.temperature_2m_min[0],
    feelsLike: d.apparent_temperature_max[0],
    precipitationChance: d.precipitation_probability_max[0] ?? 0,
    windSpeed: d.wind_speed_10m_max[0],
    weatherCode: d.weather_code[0],
    description: describeWeatherCode(d.weather_code[0]),
    locationName: loc.name,
  };
}

export function currentSeason(date = new Date()): "spring" | "summer" | "autumn" | "winter" {
  const m = date.getMonth(); // 0-11, northern hemisphere
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}
