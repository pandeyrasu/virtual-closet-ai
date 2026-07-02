"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { OutfitCard } from "@/components/OutfitCard";
import {
  getItems,
  getTryonPhotos,
  newId,
  saveItem,
  saveOutfit,
} from "@/lib/db";
import {
  suggestOutfits,
  type OutfitSuggestion,
} from "@/lib/outfit-engine";
import type {
  ClothingItem,
  Occasion,
  TryonPhoto,
  WeatherSnapshot,
} from "@/lib/types";
import { ALL_OCCASIONS } from "@/lib/types";
import {
  currentSeason,
  fetchTodayWeather,
  geocodeCity,
  getBrowserLocation,
} from "@/lib/weather";

const CITY_KEY = "closet-city";

export default function TodayPage() {
  const [items, setItems] = useState<ClothingItem[] | null>(null);
  const [tryonPhotos, setTryonPhotos] = useState<TryonPhoto[]>([]);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [occasion, setOccasion] = useState<Occasion>("casual");
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
  const [savedSigs, setSavedSigs] = useState<Set<string>>(new Set());

  const season = currentSeason();

  const loadWeather = useCallback(async (cityName?: string) => {
    setWeatherError(null);
    try {
      let loc = null;
      if (cityName) {
        loc = await geocodeCity(cityName);
        if (!loc) {
          setWeatherError(`Couldn't find “${cityName}”.`);
          return;
        }
        localStorage.setItem(CITY_KEY, cityName);
      } else {
        loc = await getBrowserLocation();
        if (!loc) {
          const stored = localStorage.getItem(CITY_KEY);
          if (stored) loc = await geocodeCity(stored);
        }
      }
      if (!loc) {
        setWeatherError("Enter a city to get weather-aware suggestions.");
        return;
      }
      setWeather(await fetchTodayWeather(loc));
    } catch {
      setWeatherError("Weather is unavailable right now — suggestions will use season only.");
    }
  }, []);

  useEffect(() => {
    void getItems().then(setItems);
    void getTryonPhotos().then(setTryonPhotos);
    void loadWeather();
  }, [loadWeather]);

  const regenerate = useCallback(() => {
    if (!items) return;
    setSuggestions(suggestOutfits(items, { weather, season, occasion }, 3));
  }, [items, weather, season, occasion]);

  useEffect(() => {
    regenerate();
  }, [regenerate]);

  const sig = (s: OutfitSuggestion) =>
    s.items.map((i) => i.id).sort().join("|");

  async function handleSave(s: OutfitSuggestion) {
    await saveOutfit({
      id: newId(),
      itemIds: s.items.map((i) => i.id),
      date: new Date().toISOString().slice(0, 10),
      score: s.score,
      reason: s.reasons.join("; "),
      tryonPhotoId: null,
      createdAt: Date.now(),
    });
    setSavedSigs((prev) => new Set(prev).add(sig(s)));
  }

  async function handleWear(s: OutfitSuggestion) {
    const now = Date.now();
    for (const item of s.items) {
      await saveItem({ ...item, wearCount: item.wearCount + 1, lastWorn: now });
    }
    setItems(await getItems());
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Today’s outfit</h1>
          {weather ? (
            <p className="text-sm text-ink/70">
              {weather.locationName}: {weather.description.toLowerCase()},{" "}
              {Math.round(weather.tempMin)}–{Math.round(weather.tempMax)}°C
              (feels like {Math.round(weather.feelsLike)}°C)
              {weather.precipitationChance >= 45
                ? ` · ${weather.precipitationChance}% chance of rain ☔`
                : ""}{" "}
              · {season}
            </p>
          ) : (
            <p className="text-sm text-ink/50">{weatherError ?? "Loading weather…"}</p>
          )}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (city.trim()) void loadWeather(city.trim());
          }}
        >
          <input
            className="input w-36"
            placeholder="City…"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <button className="btn-secondary" type="submit">
            Set
          </button>
        </form>
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink/60">Occasion:</span>
        {ALL_OCCASIONS.map((o) => (
          <button
            key={o}
            className={`chip ${occasion === o ? "!bg-ink !text-cream" : "hover:bg-ink/5"}`}
            onClick={() => setOccasion(o)}
          >
            {o}
          </button>
        ))}
        <button className="btn-secondary ml-auto" onClick={regenerate}>
          🔄 Shuffle
        </button>
      </section>

      {items === null ? (
        <p className="text-ink/50">Loading your closet…</p>
      ) : suggestions.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <span className="text-4xl">👗</span>
          <p className="font-medium">Not enough clothes yet</p>
          <p className="max-w-sm text-sm text-ink/60">
            Add at least a top and a bottom (or a dress) to your closet and
            outfit suggestions will appear here.
          </p>
          <Link href="/closet" className="btn-primary">
            Go to closet
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {suggestions.map((s) => (
            <OutfitCard
              key={sig(s)}
              suggestion={s}
              tryonPhotos={tryonPhotos}
              onSave={() => void handleSave(s)}
              onWear={() => void handleWear(s)}
              saved={savedSigs.has(sig(s))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
