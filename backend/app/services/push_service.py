"""
VAPID-Key-Verwaltung und Web-Push-Benachrichtigungen.
Keys werden beim ersten Start generiert und in /app/uploads/vapid_keys.json gespeichert.
"""
import base64
import json
import asyncio
from datetime import datetime, timedelta
from pathlib import Path

VAPID_KEYS_FILE = Path("/app/uploads/vapid_keys.json")
VAPID_CLAIMS    = {"sub": "mailto:admin@cardvault.app"}

# Cache im Speicher
_vapid_private_pem: str | None = None
_vapid_public_key:  str | None = None


def _generate_keys() -> tuple[str, str]:
    """Generiert ein neues VAPID-Schlüsselpaar.
    Gibt (private_pem, public_key_base64url) zurück.
    """
    from py_vapid import Vapid
    from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

    vapid = Vapid()
    vapid.generate_keys()

    private_pem = vapid.private_pem().decode()
    public_key  = base64.urlsafe_b64encode(
        vapid.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    ).rstrip(b"=").decode()

    return private_pem, public_key


def get_vapid_keys() -> tuple[str, str]:
    """Lädt oder generiert VAPID-Keys (cached). Gibt (private_pem, public_key) zurück."""
    global _vapid_private_pem, _vapid_public_key

    if _vapid_private_pem and _vapid_public_key:
        return _vapid_private_pem, _vapid_public_key

    if VAPID_KEYS_FILE.exists():
        data = json.loads(VAPID_KEYS_FILE.read_text())
        _vapid_private_pem = data["private"]
        _vapid_public_key  = data["public"]
    else:
        _vapid_private_pem, _vapid_public_key = _generate_keys()
        VAPID_KEYS_FILE.parent.mkdir(parents=True, exist_ok=True)
        VAPID_KEYS_FILE.write_text(json.dumps({
            "private": _vapid_private_pem,
            "public":  _vapid_public_key,
        }))
        print(f"[push] Neue VAPID-Keys generiert und gespeichert: {VAPID_KEYS_FILE}")

    return _vapid_private_pem, _vapid_public_key


def send_push(endpoint: str, p256dh: str, auth: str, title: str, body: str, url: str = "/reminders") -> None:
    """Sendet eine Web-Push-Benachrichtigung (synchron, läuft im Thread-Pool)."""
    from pywebpush import webpush, WebPushException

    private_pem, _ = get_vapid_keys()
    payload = json.dumps({
        "notification": {
            "title": title,
            "body":  body,
            "icon":  "/favicon.ico",
            "badge": "/favicon.ico",
            "data":  {"url": url},
        }
    })

    try:
        webpush(
            subscription_info={"endpoint": endpoint, "keys": {"p256dh": p256dh, "auth": auth}},
            data=payload,
            vapid_private_key=private_pem,
            vapid_claims=VAPID_CLAIMS,
        )
    except WebPushException as e:
        # 410 Gone = Subscription abgelaufen → Eintrag kann gelöscht werden
        if e.response and e.response.status_code == 410:
            raise
        print(f"[push] Fehler beim Senden: {e}")


async def reminder_notification_loop(db_factory) -> None:
    """Läuft alle 60 Sekunden und schickt Push-Benachrichtigungen.

    Jede Erinnerung hat ein notify_before_minutes-Feld (Standard: 30).
    Die Benachrichtigung wird gesendet wenn:
        due_date - notify_before_minutes <= jetzt <= due_date - notify_before_minutes + 2min
    """
    from sqlalchemy import select, and_
    from app.models.reminder import Reminder
    from app.models.push_subscription import PushSubscription

    print("[push] Benachrichtigungs-Loop gestartet")
    while True:
        await asyncio.sleep(60)
        try:
            now = datetime.utcnow()

            async with db_factory() as db:
                # Alle nicht-erledigten, noch nicht benachrichtigten Erinnerungen laden
                r_result = await db.execute(
                    select(Reminder).where(
                        and_(
                            Reminder.is_done == False,
                            Reminder.notification_sent == False,
                        )
                    )
                )
                candidates = r_result.scalars().all()

                # Prüfen welche im Benachrichtigungsfenster liegen
                reminders = [
                    r for r in candidates
                    if (r.due_date - timedelta(minutes=r.notify_before_minutes)) <= now
                    <= (r.due_date - timedelta(minutes=r.notify_before_minutes) + timedelta(minutes=2))
                ]

                if not reminders:
                    continue

                # Alle Push-Subscriptions laden
                s_result  = await db.execute(select(PushSubscription))
                subs      = s_result.scalars().all()

                if not subs:
                    # Keine Subscriptions → nur als gesendet markieren
                    for r in reminders:
                        r.notification_sent = True
                    await db.commit()
                    continue

                loop = asyncio.get_event_loop()
                for r in reminders:
                    minutes = r.notify_before_minutes
                    if minutes == 0:
                        when = "jetzt fällig"
                    elif minutes < 60:
                        when = f"in {minutes} Minuten fällig"
                    elif minutes == 60:
                        when = "in 1 Stunde fällig"
                    else:
                        hours = minutes // 60
                        when = f"in {hours} Stunden fällig"
                    title = f"🔔 Erinnerung — {when}"
                    body  = r.note or f"Eine Erinnerung ist {when}."
                    stale = []
                    for sub in subs:
                        try:
                            await loop.run_in_executor(
                                None, send_push, sub.endpoint, sub.p256dh, sub.auth, title, body
                            )
                        except Exception:
                            stale.append(sub)

                    # Abgelaufene Subscriptions entfernen
                    for sub in stale:
                        await db.delete(sub)

                    r.notification_sent = True

                await db.commit()

        except Exception as exc:
            print(f"[push] Loop-Fehler: {exc}")
