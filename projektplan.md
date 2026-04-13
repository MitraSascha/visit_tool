ein Tool für:

Partnerbetriebe
andere Gewerke
Händler
Versicherungen
Berater
Dienstleister
Herstellerkontakte
gelegentliche Projektpartner

Und genau dafür ist Excel meistens noch ungeeigneter, weil man später eher nach Leistung, Gewerk, Ort, Einsatzfall oder Notiz sucht als nur nach Namen.

Dann würde ich es so denken

Nicht als:

„Liste von Visitenkarten“

sondern als:

Partnerdatenbank
mit Kartenbildern als Anhang

Die Visitenkarte ist dann nur die Quelle der Kontaktdaten, aber das eigentliche Ziel ist:

schnell passenden Partner finden
Kontakte nach Gewerk/Leistung durchsuchen
merken, wer wofür gut ist
Projektbezug oder Einsatznotizen hinterlegen
Was in deinem Fall wirklich wichtig wäre

Bei solchen Kontakten würde ich diese Felder priorisieren:

Stammdaten
Firma
Ansprechpartner
Position
Telefon
Mobil
E-Mail
Website
Adresse
Einordnung
Hauptkategorie
z. B. Händler, Versicherung, Beratung, Elektriker, Maler, Trocknerfirma, Fliesenleger
Unterkategorie / Gewerk
Ort / Einsatzgebiet
Tags
Praxisnutzen
Was macht die Firma genau?
Wofür ist der Kontakt interessant?
Wann würde man den anrufen?
Hat man schon zusammen gearbeitet?
War die Zusammenarbeit gut?
Gibt es Besonderheiten?
Wer im Büro kennt den Kontakt?
Anhänge
Bild Vorderseite
Bild Rückseite
ggf. PDF / Angebotsflyer / Notizen
Sehr wichtige Suchlogik

Damit das Ding nützlich wird, musst du später suchen können wie:

„Fliesenleger Potsdam“
„Versicherung Wasserschaden“
„Händler Badmöbel Berlin“
„Elektriker zuverlässig“
„Partner für größere Sanierung“
„Firma für Leckageortung“

Das ist der eigentliche Mehrwert.

Sinnvolle Zusatzfelder für euch

Weil ihr nur teilweise mit denen Projekte macht, wären diese Felder stark:

zusammengearbeitet_ja_nein
letztes_projekt
bewertung_intern
empfohlen_von
notizen
reaktionsgeschwindigkeit
einsatzgebiet
gewerk
priorität

Dann kannst du später nicht nur Kontakte speichern, sondern intern sagen:

mit wem arbeitet man gerne
wen ruft man im Ernstfall an
wer ist nur „nice to have“
wer ist wirklich relevant
Meine Empfehlung zur Struktur

Ich würde es nicht „Visitenkarten-Tool“ nennen, sondern eher:

Partnerverzeichnis
Netzwerkverzeichnis
Dienstleisterverzeichnis
Partnerkontakte

Denn dadurch baust du es gleich richtig.

Minimal sinnvolle Tabellenstruktur
Tabelle partner_contact
id
company_name
contact_name
job_title
phone
mobile
email
website
street
zip_code
city
category
trade
service_description
service_area
tags
note
recommended_by
has_worked_with_us
internal_rating
last_project
created_at
updated_at
Tabelle partner_card_asset
id
partner_contact_id
file_path
type (front, back, document)
created_at
Noch besser als freie Texte

Ein paar Dinge würde ich als Auswahlfelder bauen:

Kategorie
Gewerk
Zusammenarbeit ja/nein
Bewertung intern

Sonst wird später gesucht nach:

Elektriker
Elektro
E-Technik
Elektrofirma

und alles wird unübersichtlich.

Praktischer Ablauf

So würde ich den Prozess machen:

Visitenkarte fotografieren
OCR liest Daten grob aus
Firma + Ansprechpartner + Telefon + Mail vorbelegen
Mitarbeiter ergänzt:
Kategorie
Gewerk
Einsatzgebiet
kurze Notiz
relevant für was
speichern
später über Suche/Filter wiederfinden
Mein ehrlicher Rat

Für euren Fall ist das nur dann sinnvoll, wenn du zusätzlich interne Einordnung speicherst.

Denn nur die reinen Kartendaten helfen später wenig.
Wirklich hilfreich wird es erst mit Sachen wie:

„macht auch kurzfristige Einsätze“
„gut bei Versicherungsschäden“
„kennt große Mehrfamilienhäuser“
„teuer, aber zuverlässig“
„über BNI kennengelernt“
„schon 2 Projekte zusammen gemacht“

Genau das steht nämlich nicht auf der Visitenkarte, ist aber später das Wertvolle.

Fazit

Ja, dafür lohnt sich so ein kleines Tool eher als Excel.
Aber ich würde es direkt als Partner- und Dienstleisterverzeichnis mit Visitenkartenablage bauen, nicht als reine Kartenliste.

Am sinnvollsten wäre wahrscheinlich:

Kartenbild speichern
OCR
strukturierte Felder
Tags/Kategorien
interne Notizen
starke Suche und Filter