# Bug Report — Visitenkartentool
**Erstellt:** 2026-04-14  
**Analysiert von:** Claude Code (3 parallele Subagents: Frontend, Backend, Infrastruktur)  
**Gesamt:** 27 Probleme — 5 kritisch · 9 hoch · 9 mittel · 4 niedrig

---

## KRITISCH — Sofort beheben

| # | Problem | Datei | Details |
|---|---------|-------|---------|
| 1 | **API-Keys in `.env` im Git** | `.env` | `ANTHROPIC_API_KEY` und `HERO_API_TOKEN` als Klartext — Keys sofort rotieren! |
| 2 | **Import-Fehler in `duplicates.py`** | `backend/app/api/duplicates.py:6` | `get_db` wird aus `deps.py` importiert — existiert dort nicht. App crasht bei Duplicate-API-Aufruf |
| 3 | **`py_vapid` fehlt in `requirements.txt`** | `backend/requirements.txt` | `push_service.py` importiert `py_vapid`, aber die Dependency ist nicht deklariert → Backend startet nicht |
| 4 | **Hardcodierte `/api/` URLs statt `environment.apiUrl`** | `interaction-api.service.ts:9`, `geo-api.service.ts:11`, `duplicate-api.service.ts:11` | In Dev-Umgebung gehen Requests an falschen Host (localhost:3000 statt localhost:8000) |
| 5 | **`datetime.utcnow()` erzeugt naive Datetimes** | 12 Stellen in Models und APIs | DB-Spalten sind `timezone=True`, Python-Code erzeugt naive Datetimes → Vergleichsfehler/DB-Exceptions |

---

## HOCH — Bald beheben

| # | Problem | Datei | Details |
|---|---------|-------|---------|
| 6 | **Alembic-Migrationen als Raw-SQL in `lifespan()`** | `backend/app/main.py:45-60` | `ALTER TABLE` läuft bei jedem Start, keine Versionskontrolle |
| 7 | **Memory Leaks in 5+ Komponenten** | `reminders.ts`, `projects-list.ts`, `groups-list.ts`, `activity-log.ts`, `reminders-widget.ts` | Subscriptions ohne `takeUntil()` / `OnDestroy` |
| 8 | **Promise.all() für Asset-Upload ohne Rollback** | `capture.ts:228-233` | Contact wird erstellt, aber wenn Asset-Upload fehlschlägt → inkonsistenter DB-Zustand |
| 9 | **`company_name` null-crash im QR-Download** | `qr-vcard.ts:67` | `.replace()` auf potentiell `null` → Runtime Error |
| 10 | **`toPromise()` deprecated** | `capture.ts:225, 230, 232` | Durch `firstValueFrom()` ersetzen |
| 11 | **Push-Subscription keys ohne Strukturvalidierung** | `backend/app/schemas/push_subscription.py:5` | `keys: dict` — `p256dh` und `auth` könnten `None` sein |
| 12 | **`contactId` Standard-Wert `0` statt `null`** | `evaluation-form.ts:17` | Sendet API-Requests mit ID 0 wenn Route-Parameter fehlt |
| 13 | **Fehlende Caddy-Service-Definition** | `docker-compose.yml` | Caddyfile vorhanden, aber kein Caddy-Container → HTTPS in Production broken |
| 14 | **Frontend `depends_on` Backend ohne Health-Check** | `docker-compose.yml` | Frontend kann starten bevor Backend bereit ist |

---

## MITTEL

| # | Problem | Datei | Details |
|---|---------|-------|---------|
| 15 | **Fehlende Email-Validierung** | `contact.py` Schema, `capture.ts`, `contact-edit.ts` | `email: str` ohne `EmailStr`, keine `Validators.email` im Frontend |
| 16 | **OCR-Endpoint ohne Dateigrößen-Limit** | `backend/app/api/ocr.py` | Asset-Upload hat 20MB-Limit, OCR-Endpoint nicht |
| 17 | **DB-Constraints für Ratings fehlen** | `evaluation.py`, `contact.py` | `quality: int` ohne `CheckConstraint(1-5)` |
| 18 | **CORS zu weit offen** | `backend/app/main.py:106-107` | `allow_methods=["*"], allow_headers=["*"]` |
| 19 | **ngsw-config.json unvollständig** | `frontend/ngsw-config.json` | 6+ API-Endpoints (reminders, evaluations, geo...) werden nicht gecacht → Offline kaputt |
| 20 | **Race Condition bei Push-Subscriptions** | `backend/app/api/push.py:30-34` | Check-then-Insert ohne atomare Operation |
| 21 | **`print()` statt `logging`** | `backend/app/services/push_service.py` | 5 Stellen — nicht strukturiert, nicht filterbar |
| 22 | **`navigator.share()` ohne Feature-Guard** | `contact-detail.ts:89` | Fehler auf Browsern ohne Share-API |
| 23 | **Fehlende Error-Handler in Activity-Log** | `activity-log.ts:20-22` | API-Fehler verschwinden stumm |

---

## NIEDRIG

| # | Problem | Details |
|---|---------|---------|
| 24 | `alert()` statt Toast für "Kopiert" | `contact-detail.ts:145` — unschöne Browser-Alert-Box |
| 25 | `any`-Typen in Map-View | `map-view.ts:30-31` — Leaflet-Instanzen als `any` getypt |
| 26 | Doppelkonfiguration Nginx + Caddy | Caddyfile ist Dead Code oder unvollständige Prod-Vorbereitung |
| 27 | `ANTHROPIC_API_KEY` fehlt in `.env.example` | Neue Deployments werden scheitern ohne Dokumentation |

---

## Empfohlene Fix-Reihenfolge

1. `py_vapid` zu `requirements.txt` hinzufügen + Import-Fix in `duplicates.py` (Backend startet sonst nicht korrekt)
2. `datetime.utcnow()` → `datetime.now(timezone.utc)` an allen 12 Stellen
3. Hardcodierte `/api/` URLs in `interaction-api.service.ts`, `geo-api.service.ts`, `duplicate-api.service.ts` durch `environment.apiUrl` ersetzen
4. `.env` aus Git entfernen + `.gitignore` prüfen, API-Keys rotieren
5. Memory Leaks (Subscriptions) in den 5 Komponenten beheben
6. `qr-vcard.ts:67` null-check für `company_name`
