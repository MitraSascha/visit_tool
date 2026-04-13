"""
OCR Service — nutzt Claude claude-haiku-4-5 für Visitenkarten-Erkennung.

Sendet Bilder direkt an die Anthropic API. Claude extrahiert nicht nur
Kontaktdaten, sondern leitet auch Kategorie, Gewerk und Einsatzgebiet ab.
"""
import base64
import io
import json
import logging
import re
from typing import IO

from PIL import Image

from app.config import settings
from app.schemas.ocr import OcrResult

logger = logging.getLogger(__name__)

_CATEGORIES = [
    "Elektriker", "Fliesenleger", "Maler", "Sanitär", "Trocknerfirma",
    "Händler", "Versicherung", "Beratung", "Leckageortung", "Schlosser",
    "Schreiner", "Dachdecker", "Garten & Landschaft", "Reinigung", "Sonstiges",
]

_PROMPT = f"""\
You see one or two sides of a business card. Extract ALL information and also \
infer business context.

Reply with ONLY a JSON object — no explanation, no markdown, no code block.
Use null for any field you cannot determine.

Fields to extract from the card:
- company_name: the company/brand name
- contact_name: the person's full name (not the company)
- job_title: the person's role/title (first/main title if multiple)
- phone: direct landline or office number (personal preferred over company central)
- mobile: cell/handy number
- email: email address
- website: website URL (without https://)
- street: street address with house number (e.g. "Musterstr. 5"), NOT a PO box
- zip_code: numeric postal code only (e.g. "80331")
- city: city name

Fields to INFER from company name, job title and context:
- category: pick the SINGLE best match from this list, or null if unclear:
  {json.dumps(_CATEGORIES, ensure_ascii=False)}
- trade: specific trade/Gewerk in 1–3 words (e.g. "Heizung & Sanitär", "Elektroinstallation")
- service_description: one sentence describing what this company does
- service_area: geographic service region if inferable (e.g. "Berlin", "Bundesweit", "Region Nord-Ost")
- tags: 3–6 relevant keywords, comma-separated (e.g. "Heizung,Sanitär,Berlin,Kundendienst")

If two card sides are shown: personal contact details take priority over \
corporate HQ details. Ignore slogans and marketing text for contact_name.

{{
  "company_name": null,
  "contact_name": null,
  "job_title": null,
  "phone": null,
  "mobile": null,
  "email": null,
  "website": null,
  "street": null,
  "zip_code": null,
  "city": null,
  "category": null,
  "trade": null,
  "service_description": null,
  "service_area": null,
  "tags": null
}}"""


def _load_and_encode(source: bytes | IO[bytes]) -> tuple[str, str]:
    """Lädt Bild, konvertiert zu JPEG, gibt (base64, media_type) zurück."""
    if isinstance(source, (bytes, bytearray)):
        img = Image.open(io.BytesIO(source))
    else:
        img = Image.open(source)

    max_w = 1600
    if img.width > max_w:
        ratio = max_w / img.width
        img = img.resize((max_w, int(img.height * ratio)), Image.Resampling.LANCZOS)

    if img.mode != "RGB":
        img = img.convert("RGB")

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=88)
    return base64.b64encode(buf.getvalue()).decode(), "image/jpeg"


def _strip_trailing_commas(s: str) -> str:
    return re.sub(r",\s*([}\]])", r"\1", s)


def _parse_json(text: str) -> dict:
    text = text.strip()

    def _try(s: str) -> dict:
        s = _strip_trailing_commas(s)
        obj = json.loads(s)
        if isinstance(obj, list) and obj:
            obj = obj[0]
        return obj if isinstance(obj, dict) else {}

    for attempt in [
        lambda: _try(text),
        lambda: _try(re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL).group(1)),  # type: ignore[union-attr]
        lambda: _try(re.search(r"\{.*\}", text, re.DOTALL).group(0)),  # type: ignore[union-attr]
    ]:
        try:
            return attempt()
        except Exception:
            pass

    logger.warning("Kein JSON aus Claude-Antwort extrahierbar:\n%s", text[:400])
    return {}


def _call_claude(images_b64: list[tuple[str, str]]) -> dict:
    """Ruft Claude claude-haiku-4-5 mit einem oder zwei Bildern auf."""
    import anthropic

    content: list = []
    for b64, media_type in images_b64:
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": b64},
        })
    content.append({"type": "text", "text": _PROMPT})

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[{"role": "user", "content": content}],
    )

    raw = message.content[0].text if message.content else ""
    logger.debug("Claude Rohausgabe: %s", raw[:400])
    return _parse_json(raw)


def _dict_to_ocr_result(data: dict) -> OcrResult:
    def clean(val) -> str | None:
        if val is None or str(val).strip().lower() in ("null", "none", "n/a", "", "..."):
            return None
        return str(val).strip()

    norm = {k.lower().replace(" ", "_"): v for k, v in data.items()}

    def get(*keys):
        for k in keys:
            if k in norm:
                return norm[k]
        return None

    return OcrResult(
        company_name        =clean(get("company_name")),
        contact_name        =clean(get("contact_name")),
        job_title           =clean(get("job_title")),
        phone               =clean(get("phone", "phone_number")),
        mobile              =clean(get("mobile", "mobile_number", "cell")),
        email               =clean(get("email", "email_address")),
        website             =clean(get("website")),
        street              =clean(get("street", "street_address")),
        zip_code            =clean(get("zip_code", "zip", "postal_code")),
        city                =clean(get("city")),
        category            =clean(get("category")),
        trade               =clean(get("trade")),
        service_description =clean(get("service_description")),
        service_area        =clean(get("service_area")),
        tags                =clean(get("tags")),
        raw_text            =json.dumps(data, ensure_ascii=False),
    )


# ── Öffentliche API ───────────────────────────────────────────────────────

def extract_text_from_image(
    front: bytes | IO[bytes],
    back:  bytes | IO[bytes] | None = None,
) -> OcrResult:
    images = [_load_and_encode(front)]
    if back is not None:
        images.append(_load_and_encode(back))
    data = _call_claude(images)
    return _dict_to_ocr_result(data)


def extract_text_from_base64(b64_data: str) -> OcrResult:
    if "," in b64_data:
        b64_data = b64_data.split(",", 1)[1]
    image_bytes = base64.b64decode(b64_data)
    return extract_text_from_image(image_bytes)
