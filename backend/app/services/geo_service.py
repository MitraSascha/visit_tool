import asyncio
import httpx
from typing import Optional

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "card-vault/1.0"
_lock = asyncio.Lock()

async def geocode_address(street: str | None, zip_code: str | None, city: str | None) -> Optional[tuple[float, float]]:
    """Gibt (lat, lng) zurück oder None wenn Geocoding fehlschlägt."""
    parts = [p for p in [street, zip_code, city] if p]
    if not parts:
        return None

    query = ", ".join(parts)

    async with _lock:
        await asyncio.sleep(1.0)  # Nominatim Rate-Limit: 1 req/s
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    NOMINATIM_URL,
                    params={"q": query, "format": "json", "limit": 1},
                    headers={"User-Agent": USER_AGENT},
                    timeout=10.0
                )
                resp.raise_for_status()
                data = resp.json()
                if data:
                    return float(data[0]["lat"]), float(data[0]["lon"])
            except Exception:
                pass
    return None
