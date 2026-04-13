"""
Hero CRM Integration — Termine für den konfigurierten Partner abrufen.
"""
from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import CurrentUser
from app.config import settings

router = APIRouter()

CRM_QUERY = """
query GetCalendar($partner_ids: [Int!]!, $start: DateTime!, $end: DateTime!) {
  calendar_events(partner_ids: $partner_ids, start: $start, end: $end) {
    id
    title
    start
    end
    partners {
      full_name
    }
  }
}
"""


class CrmEvent(BaseModel):
    id: int
    title: str
    start: str
    end: str
    partners: list[str]


@router.get("/crm/events", response_model=list[CrmEvent])
async def get_crm_events(
    current_user: CurrentUser,
    days: int = Query(7, ge=1, le=90, description="Wie viele Tage voraus"),
) -> list[CrmEvent]:
    """Ruft Kalender-Termine aus Hero CRM für den konfigurierten Partner ab."""
    if not settings.hero_api_url or not settings.hero_api_token or not settings.hero_partner_id:
        raise HTTPException(status_code=503, detail="Hero CRM nicht konfiguriert")

    now = datetime.utcnow()
    end = now + timedelta(days=days)

    payload = {
        "query": CRM_QUERY,
        "variables": {
            "partner_ids": [settings.hero_partner_id],
            "start": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "end": end.strftime("%Y-%m-%dT%H:%M:%SZ"),
        },
    }

    headers = {
        "Authorization": settings.hero_api_token,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.post(settings.hero_api_url, json=payload, headers=headers)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=502, detail=f"Hero CRM Fehler: {e.response.status_code}")
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Hero CRM nicht erreichbar: {e}")

    data = resp.json()

    if "errors" in data:
        raise HTTPException(status_code=502, detail=f"Hero CRM GraphQL-Fehler: {data['errors']}")

    events_raw = data.get("data", {}).get("calendar_events", [])

    return [
        CrmEvent(
            id=e["id"],
            title=e["title"] or "(Kein Titel)",
            start=e["start"],
            end=e["end"],
            partners=[p["full_name"] for p in (e.get("partners") or [])],
        )
        for e in events_raw
    ]
