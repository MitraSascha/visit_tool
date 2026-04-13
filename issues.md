# Issues

1. Import von Terminen aus meinem CRM-System ins tool.

    - API endnpunkte: 

    Person von der wir die Termine abrufen:
    
"id": 
94314,  
"full_name": 
"Patrick van Dalen",
"user": 
"id": 
245920,
"email": 
"hey@mitra-sanitaer.de"

Alle termine Abrufen (muss entsprechend angepasst werden): 
{
  "query": "{ global_search(term: \"Termin\", category: calendar_events, first: 10) { ... on CalendarEvent { id title start end } } }"
}

URL und Key habe ich in der .env gespeichert