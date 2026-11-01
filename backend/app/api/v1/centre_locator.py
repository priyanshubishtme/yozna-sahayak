"""Proxy endpoints for Centre Locator: Nominatim geocoding and Overpass POI search.

Mounted at /api/geocode and /api/centres to match centre-locator expectations.
"""

import asyncio
import re
import time
from typing import Optional

import httpx
from fastapi import APIRouter, Query, HTTPException

router = APIRouter(prefix="/api", tags=["centre-locator"])

# ---------------------------------------------------------------------------
# Rate-limit state and in-memory caches
# ---------------------------------------------------------------------------
_nominatim_last_call: float = 0.0
_nominatim_lock = asyncio.Lock()
_geocode_cache: dict[str, list] = {}

_overpass_last_call: float = 0.0
_overpass_lock = asyncio.Lock()
_centres_cache: dict[str, list] = {}

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_ENDPOINTS = [
    "https://overpass.openstreetmap.fr/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]
USER_AGENT = "YojanaSahayak-CentreLocator/1.0"
MIN_REQUEST_GAP = 1.1  # seconds


@router.get("/geocode")
async def geocode(q: str = Query(..., min_length=1, description="Search query (city, locality, or 6-digit PIN)")):
    """Proxy Nominatim geocoding with 1.1 s rate-limit spacing and caching."""
    global _nominatim_last_call

    query_str = q.strip()
    key = query_str.lower()
    if key in _geocode_cache:
        return _geocode_cache[key]

    is_pin = bool(re.match(r"^\d{6}$", query_str))

    async with _nominatim_lock:
        elapsed = time.monotonic() - _nominatim_last_call
        if elapsed < MIN_REQUEST_GAP:
            await asyncio.sleep(MIN_REQUEST_GAP - elapsed)

        params = {
            "format": "jsonv2",
            "addressdetails": "1",
            "limit": "5",
            "countrycodes": "in",
        }
        if is_pin:
            params["postalcode"] = query_str
            params["country"] = "India"
        else:
            params["q"] = query_str

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                resp = await client.get(
                    NOMINATIM_URL,
                    params=params,
                    headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
                )
                _nominatim_last_call = time.monotonic()
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"Could not reach Nominatim: {e}")

        if resp.status_code != 200:
            raise HTTPException(
                status_code=resp.status_code if resp.status_code in (400, 429) else 502,
                detail=f"Nominatim returned HTTP {resp.status_code}",
            )

        try:
            hits = resp.json()
        except Exception:
            raise HTTPException(status_code=502, detail="Nominatim returned invalid JSON")

        if not isinstance(hits, list):
            raise HTTPException(status_code=502, detail="Nominatim returned an invalid response format")

        if is_pin:
            hits = [
                h for h in hits
                if h.get("address", {}).get("postcode", "").replace(" ", "") == query_str
            ]

        _geocode_cache[key] = hits
        if len(_geocode_cache) > 200:
            _geocode_cache.pop(next(iter(_geocode_cache)))
        return hits


@router.get("/centres")
async def centres(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(10, ge=1, le=50),
):
    """Proxy Overpass API for nearby healthcare, post offices, government, and agriculture offices."""
    global _overpass_last_call

    cache_key = f"{latitude:.5f},{longitude:.5f},{radius_km}"
    if cache_key in _centres_cache:
        return {
            "source": "OpenStreetMap",
            "endpoint": "cache",
            "elements": _centres_cache[cache_key],
        }

    radius_m = int(radius_km * 1000)
    around = f"(around:{radius_m},{latitude},{longitude})"
    query = (
        f"[out:json][timeout:15];("
        f'nwr["amenity"="hospital"]{around};'
        f'nwr["amenity"="clinic"]{around};'
        f'nwr["amenity"="post_office"]{around};'
        f'nwr["amenity"="townhall"]{around};'
        f'nwr["office"="government"]{around};'
        f'nwr["government"="agriculture"]{around};'
        f");out center tags 300;"
    )

    async with _overpass_lock:
        elapsed = time.monotonic() - _overpass_last_call
        if elapsed < MIN_REQUEST_GAP:
            await asyncio.sleep(MIN_REQUEST_GAP - elapsed)

        last_error = "Could not reach Overpass"
        for endpoint in OVERPASS_ENDPOINTS:
            try:
                async with httpx.AsyncClient(timeout=25.0) as client:
                    resp = await client.post(
                        endpoint,
                        data={"data": query},
                        headers={
                            "User-Agent": USER_AGENT,
                            "Accept": "application/json",
                            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                        },
                    )
                    _overpass_last_call = time.monotonic()

                if resp.status_code == 200:
                    data = resp.json()
                    elements = data.get("elements", [])
                    _centres_cache[cache_key] = elements
                    if len(_centres_cache) > 100:
                        _centres_cache.pop(next(iter(_centres_cache)))
                    return {
                        "source": "OpenStreetMap",
                        "endpoint": endpoint,
                        "elements": elements,
                    }
                else:
                    last_error = f"Overpass HTTP {resp.status_code}"
            except Exception as e:
                last_error = str(e)

        raise HTTPException(status_code=502, detail=f"Overpass query failed: {last_error}")
