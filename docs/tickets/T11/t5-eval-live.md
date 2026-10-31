# T5-Auswertung live (31.10.2026, nach Ergänzung von `references` in P1 und P2)

Zwei Läufe `npm run eval` hintereinander, Bewertungszeitpunkt 30.10.2026 18:00. Abweichungen und Ursachen: `abweichungen.md`. Vorlauf vom 30.10. 17:00: git-Historie dieser Datei.

## Lauf 1 (02:44–02:48)
8 von 8 Fällen wie erwartet, 0 teilweise.

| Profil | Bekanntmachung | Erwartet | Ergebnis | Punkte | Passt | K.O. / To-do |
|---|---|---|---|---|---|---|
| p1-alpendach | Systemdach und Spenglerarbeiten, Bernau | GO (88) | GO | 75 | ja |  |
| p1-alpendach | Dachabdichtungsarbeiten, Staatliches Bauamt Erlangen-Nürnberg | NO-GO (25) | vom Vorfilter ausgeschlossen | – | ja |  |
| p1-alpendach | Stahlbauarbeiten (CPV-Falle 4526) | NO-GO (10) | vom Vorfilter ausgeschlossen | – | ja |  |
| p2-isarglanz | Reinigung Stadtbücherei/VHS Ingolstadt | GO (91) | GO | 75 | ja |  |
| p2-isarglanz | Gebäudereinigung AVA Augsburg (Frist 3 Tage) | NO-GO (18) | vom Vorfilter ausgeschlossen | – | ja |  |
| p3-isarcode | Softwareentwicklung Landtagsverwaltung (100 PT) | GO (90) | GO | 72 | ja |  |
| p3-isarcode | Weiterentwicklung AIS.chat (5,5 VZÄ) | NO-GO (22) | NO-GO | 39 | ja | Die verlangte Teamzusammensetzung umfasst 5 VZÄ Fullstack-Entwickler und zusätzlich 0,5 VZÄ UX/UI; sie überschreitet den Firmenausschluss für Gesamtteams über 2 VZÄ. |
| p3-isarcode | Helpdesk-Service DPMA (2.800 Anwender) | NO-GO (15) | NO-GO | 38 | ja | Der Auftrag umfasst 1st-Level-Support für mehr als 2.800 Anwender; dies greift unmittelbar in den Firmenausschluss für 1st-Level-Support bei mehr als 500 Endanwendern. |

## Lauf 2 (02:48–02:53)
7 von 8 Fällen wie erwartet, 1 teilweise.

| Profil | Bekanntmachung | Erwartet | Ergebnis | Punkte | Passt | K.O. / To-do |
|---|---|---|---|---|---|---|
| p1-alpendach | Systemdach und Spenglerarbeiten, Bernau | GO (88) | GO | 75 | ja |  |
| p1-alpendach | Dachabdichtungsarbeiten, Staatliches Bauamt Erlangen-Nürnberg | NO-GO (25) | vom Vorfilter ausgeschlossen | – | ja |  |
| p1-alpendach | Stahlbauarbeiten (CPV-Falle 4526) | NO-GO (10) | vom Vorfilter ausgeschlossen | – | ja |  |
| p2-isarglanz | Reinigung Stadtbücherei/VHS Ingolstadt | GO (91) | GO | 82 | ja |  |
| p2-isarglanz | Gebäudereinigung AVA Augsburg (Frist 3 Tage) | NO-GO (18) | vom Vorfilter ausgeschlossen | – | ja |  |
| p3-isarcode | Softwareentwicklung Landtagsverwaltung (100 PT) | GO (90) | GO MIT AUFLAGE | 67 | teilweise |  |
| p3-isarcode | Weiterentwicklung AIS.chat (5,5 VZÄ) | NO-GO (22) | NO-GO | 39 | ja | Die ausgeschriebene Teamzusammensetzung verlangt mindestens fünf VZÄ Fullstack-Entwicklung plus 0,5 VZÄ UX/UI; das Unternehmen schließt selbst Gesamtteams über zwei VZÄ aus. |
| p3-isarcode | Helpdesk-Service DPMA (2.800 Anwender) | NO-GO (15) | NO-GO | 39 | ja | Der Auftrag ist ein reiner 1st-Level-Helpdesk für mehr als 500 Anwender und greift damit unter den eigenen Ausschluss des Firmenpasses. / Der geforderte durchschnittliche Jahresumsatz von mindestens 1.400.000 Euro ist im Firmenpass nicht belegt; bei Nichterreichen führt dies zum Ausschluss. |

## P3 vervollständigt, 31.10. ca. 11:00
Vorher in `examples/p3-isarcode.pass.json` ergänzt (alles fiktiv, siehe `examples/README.md`): drei Referenzen 2023–2025 mit Jahr, Wert, CPV und Auftraggeberart (zwei öffentlich, eine privat; 62.000–145.000 €, 60–140 PT, Java/TypeScript, EVB-IT, Abrechnung nach PT), `revenue_band_eur` `250k-1M`, `liability_insurance_eur` 1.000.000. Die einzelne T5-Referenz ohne Jahr, Wert und CPV wurde ersetzt. Validierung: `npm run scout -- examples/p3-isarcode.pass.json --offline` ohne Fehler. P1, P2, `agent/instructions.md` und `t5-expected.json` unverändert; Bewertungszeitpunkt weiterhin 30.10.2026 18:00.

### Lauf 3 (10:55–11:01)
8 von 8 Fällen wie erwartet, 0 teilweise.

| Profil | Bekanntmachung | Erwartet | Ergebnis | Punkte | Passt | K.O. / To-do |
|---|---|---|---|---|---|---|
| p1-alpendach | Systemdach und Spenglerarbeiten, Bernau | GO (88) | GO | 74 | ja |  |
| p1-alpendach | Dachabdichtungsarbeiten, Staatliches Bauamt Erlangen-Nürnberg | NO-GO (25) | vom Vorfilter ausgeschlossen | – | ja |  |
| p1-alpendach | Stahlbauarbeiten (CPV-Falle 4526) | NO-GO (10) | vom Vorfilter ausgeschlossen | – | ja |  |
| p2-isarglanz | Reinigung Stadtbücherei/VHS Ingolstadt | GO (91) | GO | 74 | ja |  |
| p2-isarglanz | Gebäudereinigung AVA Augsburg (Frist 3 Tage) | NO-GO (18) | vom Vorfilter ausgeschlossen | – | ja |  |
| p3-isarcode | Softwareentwicklung Landtagsverwaltung (100 PT) | GO (90) | GO | 81 | ja |  |
| p3-isarcode | Weiterentwicklung AIS.chat (5,5 VZÄ) | NO-GO (22) | NO-GO | 39 | ja | Gefordert sind fünf Vollzeitäquivalente Fullstack-Entwicklung sowie zusätzlich 0,5 VZÄ UX/UI; die Firma schließt Teams über zwei VZÄ ausdrücklich aus und verfügt über vier Entwickler. |
| p3-isarcode | Helpdesk-Service DPMA (2.800 Anwender) | NO-GO (15) | NO-GO | 39 | ja | Der geforderte durchschnittliche Jahresumsatz von mindestens 1,4 Mio. Euro übersteigt das Firmenpass-Umsatzband von 250.000 bis 1 Mio. Euro. / Der Helpdesk für mehr als 2.800 Anwender fällt unter den eigenen Ausschluss für 1st-Level-Support für mehr als 500 Endanwender. / Drei geeignete Helpdesk-Referenzen aus den letzten drei Kalenderjahren sind im Firmenpass nicht ausgewiesen. |

### Lauf 4 (11:01–11:06)
8 von 8 Fällen wie erwartet, 0 teilweise.

| Profil | Bekanntmachung | Erwartet | Ergebnis | Punkte | Passt | K.O. / To-do |
|---|---|---|---|---|---|---|
| p1-alpendach | Systemdach und Spenglerarbeiten, Bernau | GO (88) | GO | 73 | ja |  |
| p1-alpendach | Dachabdichtungsarbeiten, Staatliches Bauamt Erlangen-Nürnberg | NO-GO (25) | vom Vorfilter ausgeschlossen | – | ja |  |
| p1-alpendach | Stahlbauarbeiten (CPV-Falle 4526) | NO-GO (10) | vom Vorfilter ausgeschlossen | – | ja |  |
| p2-isarglanz | Reinigung Stadtbücherei/VHS Ingolstadt | GO (91) | GO | 75 | ja |  |
| p2-isarglanz | Gebäudereinigung AVA Augsburg (Frist 3 Tage) | NO-GO (18) | vom Vorfilter ausgeschlossen | – | ja |  |
| p3-isarcode | Softwareentwicklung Landtagsverwaltung (100 PT) | GO (90) | GO | 73 | ja |  |
| p3-isarcode | Weiterentwicklung AIS.chat (5,5 VZÄ) | NO-GO (22) | NO-GO | 39 | ja | Für das Gesamtteam werden mindestens fünf VZÄ an Fullstack-Entwicklung zuzüglich UX/UI-Ressource verlangt; das überschreitet die verfügbare Firmenkapazität und den eigenen Ausschluss für Teams über zwei VZÄ. |
| p3-isarcode | Helpdesk-Service DPMA (2.800 Anwender) | NO-GO (15) | NO-GO | 39 | ja | Der Helpdesk für über 2.800 Anwender greift in den eigenen Ausschluss für 1st-Level-Support an mehr als 500 Endanwendern. / Der im Auswahlkriterium geforderte durchschnittliche Jahresumsatz von mindestens 1,4 Millionen Euro übersteigt das angegebene Umsatzband. |

Ergebnis: B5 ist in beiden Läufen GO (81, 73). Beobachtung DPMA: Mit dem neuen Umsatzband `250k-1M` nennt das Modell den geforderten Jahresumsatz von 1,4 Mio. € jetzt als echtes K.O. (vorher „unklar“); das Ergebnis NO-GO ändert sich nicht.
