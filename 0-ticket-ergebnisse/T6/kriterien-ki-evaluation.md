# Kriterien KI-Evaluation

Wie der JuicyBids-Agent entscheidet, ob eine öffentliche Ausschreibung zu einer Firma passt. Stand 30.10.2026, Schwerpunkt Bayern. Herleitung und Datenauswertung: [kriterienkatalog.md](http://kriterienkatalog.md).

Der Agent arbeitet **für die Firma**: Er sucht Wege, eine Ausschreibung gewinnbar zu machen, und warnt vor allem, was Geld, Zeit oder Risiko kostet. Er behauptet nie eine Erfüllung, die es nicht gibt, denn ein falsches GO kostet die Firma Angebotsaufwand oder führt zum Ausschluss.

# Teil 1: Kriterien

## 1\. Dürfen wir anbieten? (K.O.-Kriterien)

| Kriterium | Was der Agent prüft | Zugunsten der Firma |
| :---- | :---- | :---- |
| Berufszulassung | Eintragung in Handwerksrolle oder Handelsregister |  |
| Pflichtzertifikate | PQ-VOB, ISO 9001/27001, Entsorgungsfachbetrieb, § 34a GewO, DIN 77200 | Prüft auch das Ablaufdatum: Ein Zertifikat, das während der Vertragslaufzeit endet, wird gemeldet |
| Pflichterklärungen | Russland-Sanktionen, LkSG, Tariftreue, Mindestlohn | Werden als Routine-Unterlagen geführt, nicht als Hürde |
| Sicherheitsüberprüfung | Geforderte Stufe gegen überprüftes Personal |  |
| Sprache | Deutschsprachiges Schlüsselpersonal |  |
| Ausschlüsse der Firma | Eigene No-Gos, z. B. „keine Arbeiten über 20 m Höhe“ |  |

## 2\. Können wir uns qualifizieren und liefern?

| Kriterium | Was der Agent prüft | Zugunsten der Firma |
| :---- | :---- | :---- |
| Leistungsbeschreibung | Umfang der Ausschreibung gegen die Kernleistungen der Firma |  |
| Referenzen | Anzahl, Alter (3–5 Jahre) und Vergleichbarkeit gegen die Referenzliste | Legt Vergleichbarkeit wohlwollend, aber ehrlich aus. Fehlt etwas, schlägt er eine Bietergemeinschaft vor |
| Umsatz | Geforderter Mindestumsatz gegen die letzten 3 Jahre |  |
| Versicherung | Geforderte Deckung gegen die aktuelle Police | Eine Erhöhung dauert Tage, daher GO MIT AUFLAGE statt NO-GO |
| Personal | Beschäftigte, Fachkräfte, Meister | Bei Engpass: Nachunternehmer oder Bietergemeinschaft, falls zugelassen |
| Kapazität und Zeitraum | Ausführungszeitraum und Beginn gegen freie Kolonnen und frühesten Start | Warnt vor Überlastung durch bereits gewonnene Aufträge |
| Entfernung | Leistungsort gegen Firmensitz und Einsatzradius | Bei Daueraufträgen (Reinigung, Wachdienst) stärker gewichtet |
| Frist | Verbleibende Tage gegen den Angebotsvorlauf der Firma | „Heute anfangen“ oder „zu knapp“, damit kein Aufwand in aussichtslose Angebote fließt |

## 3\. Lohnt es sich?

| Kriterium | Was der Agent prüft | Zugunsten der Firma |
| :---- | :---- | :---- |
| Auftragsgröße | Wert im Verhältnis zum Jahresumsatz, ideal etwa 5–30 % | Schützt vor zu großen und zu kleinen Aufträgen |
| Angebotsaufwand | Formblätter, Nachweise, Konzepte, Ortstermine → geschätzte Stunden | Stellt den Aufwand der erwartbaren Marge gegenüber |
| Zuschlagslogik | Nur Preis oder auch Qualitätskriterien | Passt zur Stärke der Firma: günstige Kalkulation oder starke Konzepte und starkes Personal |
| Wettbewerb | Typische Bieterzahl für Gewerk und Region, aus früheren Zuschlägen | Bevorzugt Ausschreibungen mit wenig Konkurrenz |
| Preisanker | Zuschlagswerte vergleichbarer früherer Aufträge | Hilft, wettbewerbsfähig zu kalkulieren, ohne zu unterbieten |
| Folgepotenzial | Schreibt dieser Auftraggeber das Gewerk regelmäßig aus? Rahmenvertrag? | Wertet einen Fuß in der Tür, nicht nur den Einzelauftrag |
| Lose | Kann die Firma nur auf ein passendes Teillos bieten? | Öffnet große Ausschreibungen für kleine Firmen |

4\. Was kann uns schaden?

| Kriterium | Was der Agent prüft | Zugunsten der Firma |
| :---- | :---- | :---- |
| Sicherheitsleistung | Meist 5 % der Auftragssumme ab 250.000 € | Warnt, dass sie Liquidität bzw. den Avalrahmen der Bank bindet |
| Vertragsstrafe | Höhe und Auslöser | Meldet Klauseln über der eigenen Grenze der Firma (z. B. über 5 %) |
| Rahmenvertrag ohne Mindestabnahme | Lange Bindung ohne garantierte Aufträge | Warnt: Kapazität ist reserviert, Einnahmen sind nicht sicher |
| Kurzfristiger Beginn | z. B. „Beginn innerhalb von 12 Werktagen“ | Prüft gegen die freie Kapazität |
| Tariftreue und Lohnvorgaben | Geforderte Lohnhöhe gegen die Kostenstruktur | Prüft die Marge |
| Lange Laufzeit | z. B. 48 Monate, Preisgleitklausel ja oder nein | Warnt vor steigenden Kosten ohne Preisanpassung |
| Unklare Anforderungen | „Siehe Vergabeunterlagen“ | Listet genau auf, was vor dem Angebotsaufwand zu prüfen ist |

## 5\. Passt der CPV zur Branche?

| Stufe | Situation | Zugunsten der Firma |
| :---- | :---- | :---- |
| A | Haupt-CPV ist ein spezifischer Branchencode | Klarer Treffer |
| B | Haupt-CPV passt, aber nur grob (z. B. 45260000\) | Der Leistungstext bestätigt den Umfang |
| C | Branchencode nur als Zusatz-CPV, das Hauptgewerk ist fremd | Teilleistung: Bietergemeinschaft mit dem Hauptgewerk oder Nachunternehmer werden |
| D | Nur Sammelcode (z. B. 45000000), der Text beschreibt die Branchenleistung | Wird nicht aussortiert. Reine CPV-Filter und Listendienste übersehen diese Ausschreibungen |
| E | Nachbarcode derselben Gruppe, der Text nennt die Branchenleistung | Zählt nur, wenn der Text es trägt |
| F | Kein Branchencode, und der Text passt nicht | Wird nicht angezeigt |

Bei gemischten Ausschreibungen nennt der Agent den fremden Teil, z. B. „Elektroanteil: Elektrofachbetrieb als Partner nötig“.

Branchencodes, die in bayerischen Ausschreibungen tatsächlich vorkommen:

| Branche | CPV |
| :---- | :---- |
| Dachdecker | 45261000, 45261410, 45261215 |
| Gebäudereinigung | 90911000, 90911200, 90911300 |
| Sicherheitsdienst | 79710000, 79713000, 79715000 |
| Maler | 45442100, 45442110, 45442180 |
| Gerüstbau | 45262100 (nicht die ganze Gruppe 45262\) |
| Elektro | 45311000, 45311200, 45315000, 45317000 |
| Sanitär/Heizung/Lüftung | 45330000, 45331000, 45331100, 45331210, 45332000 |
| Tischler/Ausbau | 45421000, 45421100, 45421131, 45422000 |
| Beratung | 7940… (Liste mit dem Team festlegen, TODO) |

# Kriterien können auf Wunsch von Company anders gewertet werden. Ist in Input zu analysieren.

# 

# Teil 2: Punktebewertung

## Punkteverteilung (100 Punkte)

| Block | Kriterium | Max. | Abstufung |
| :---- | :---- | :---- | :---- |
| **Eignung (35)** | Zulassung / PQ | 10 | 10 \= präqualifiziert oder alle Eintragungen vorhanden · 8 \= alles per Eigenerklärung (Formblatt 124\) belegbar · 0 \= Eintragung fehlt (K.O.) |
|  | Referenzen | 15 | 15 \= genug vergleichbare Referenzen · 8 \= vorhanden, aber kleiner oder älter (Auflage) · 0 \= keine (K.O., außer per Bietergemeinschaft lösbar) |
|  | Umsatz, Versicherung, Personal | 10 | 10 \= alles erfüllt · 6 \= Versicherung oder Personal bis zur Frist aufstockbar (Auflage) · 0 \= Mindestumsatz verfehlt (K.O.) |
| **Leistbarkeit (25)** | CPV-Passung | 5 | A \= 5 · B \= 4 · C \= 2 · D \= 2 · E \= 1 · F \= 0 |
|  | Leistungstext | 5 | 5 \= Kernleistung · 3 \= Randleistung · 0 \= passt nicht |
|  | Kapazität / Zeitraum | 10 | 10 \= passt · 5 \= Beginn unbekannt oder nur mit Umplanung · 0 \= keine Kapazität (K.O.) |
|  | Entfernung | 5 | 5 \= innerhalb des halben Radius · 3 \= innerhalb des Radius · 0 \= außerhalb (K.O.) |
| **Wirtschaftlichkeit (25)** | Größenpassung | 10 | 10 \= 5–30 % des Jahresumsatzes · 5 \= 2–5 % oder 30–50 % · 0 \= unter 2 % oder über 50 % · Wert unbekannt \= 5 |
|  | Gewinnchance | 10 | Zuschlagslogik passt zur Stärke der Firma und wenig Wettbewerb: bis 10 · unbekannt: 5 |
|  | Aufwand im Verhältnis zum Wert | 5 | 5 \= gering · 3 \= mittel · 0 \= hoch |
| **Risiko (15)** | Start bei 15, dann Abzüge | 15 | Sicherheitsleistung −4 · Vertragsstrafe über der Firmengrenze −5 · Rahmenvertrag ohne Mindestabnahme −3 · knapper Fristpuffer −3 |

## Warum diese Gewichte

Grundlage ist die Auswertung von rund 800 offenen Ausschreibungen mit Bayernbezug (16.–29.10.2026):

- **Eignung 35:** Referenzen sind die häufigste und am schwersten nachholbare Anforderung (20 % der bayerischen Ausschreibungen, 3.535 Treffer). Bei Bauleistungen ist PQ bzw. Formblatt 124 Standard.  
- **Leistbarkeit 25:** Ausführung meist 2–8 Monate mit festem Beginn. Ohne freie Kapazität wird ein Zuschlag zum Verlust.  
- **Wirtschaftlichkeit 25:** In 85 % der Fälle zählt nur der Preis, also entscheiden Kalkulation und Wettbewerb.  
- **Risiko 15:** 5 % Sicherheitsleistung ab 250.000 € (358 Treffer) bindet Liquidität.

## Einteilung

| Ergebnis | Punkte | Bedeutung |
| :---- | :---- | :---- |
| **GO** | 70–100 | Alle K.O.-Kriterien erfüllt, der Aufwand lohnt sich |
| **GO MIT AUFLAGE** | 40–69 | Lücken, die bis zur Frist schließbar sind, mit To-do-Liste |
| **NO-GO** | 0–39 | Ein K.O.-Kriterium ist nicht erfüllbar, oder zu viele schwache Punkte |

**Deckelungen:**

- Ein nicht behebbares K.O.-Kriterium begrenzt den Score auf höchstens 39\.  
- Eine behebbare Lücke begrenzt ihn auf höchstens 69\. Dasselbe gilt für CPV-Stufe C (eigenes Gewerk nur Teilleistung).  
- Falsches Gewerk (Stufe F) oder eine abgelaufene Frist ergibt 0\.

**Warum 40 und 70:** Ein Angebot kostet eine kleine Firma etwa 1–3 Tage. Ab 70 Punkten ist alles Pflichtige erfüllt und mehr als die Hälfte der weichen Punkte erreicht, sodass sich der Aufwand lohnt. Unter 40 ist der Aufwand ziemlich sicher verloren. Beide Grenzen sind ein Startwert, den wir mit Testfällen und Rückmeldungen von Firmen kalibrieren.

## Anzeige für den Nutzer

- **Angeboten werden nur GO und GO MIT AUFLAGE.** NO-GO-Ausschreibungen erscheinen nicht in der Liste, sodass die Firma ihre Zeit nur mit Ausschreibungen verbringt, die sich lohnen.  
- Sortierung: zuerst GO, dann GO MIT AUFLAGE, jeweils nach Punkten absteigend.  
- Jede GO-MIT-AUFLAGE-Ausschreibung kommt mit ihrer To-do-Liste, z. B. „Haftpflicht auf 2 Mio. € erhöhen, ca. 3 Tage“.  
- Gibt es keine passende Ausschreibung, sagt der Bericht das offen und nennt, welche Kriterien die Kandidaten ausgeschlossen haben. Er füllt die Liste nicht auf.

## Stand der Umsetzung

Diese Datei beschreibt das Zielverhalten. Im Agenten ist es noch nicht eingebaut (TODO):

- Punktebewertung und Deckelungen  
- Anzeige nur von GO und GO MIT AUFLAGE (heute zeigt der Bericht auch NO-GO)  
- Vorfilter lässt Ausschreibungen mit nur Sammelcodes zur Textprüfung durch (CPV-Stufen D und E)