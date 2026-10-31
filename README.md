# JuicyBids

Ein bezahlter KI-Agent auf Masumi/Sokosumi (Cardano), der für kleine und mittlere Unternehmen passende öffentliche Ausschreibungen in ganz Deutschland findet und sagt, ob sich die Bewerbung lohnt.

TUM Blockchain & AI Hackathon 2026, Cardano-Track.

## Das Problem

In Deutschland werden jedes Jahr hunderttausende öffentliche Aufträge ausgeschrieben. Kleine Firmen haben niemanden, der täglich die Portale durchsucht, die Eignungskriterien liest und entscheidet, ob eine Bewerbung Sinn hat. Sie verpassen passende Aufträge oder stecken Tage in aussichtslose Angebote.

Ausschreibungsdienste gibt es, aber sie kosten dreistellige Beträge im Monat, egal ob eine Firma einmal im Quartal oder täglich sucht. Für einen Betrieb mit fünf Leuten rechnet sich das nicht.

JuicyBids setzt stattdessen auf Mikrozahlungen: ein Lauf, ein Preis, bezahlt on-chain. Kein Abo, kein Konto. Und weil die Zahlung über Masumi läuft, kann auch ein anderer KI-Agent den Auftrag auslösen und bezahlen, etwa der Büroassistent der Firma.

## Die Lösung

JuicyBids bekommt einmal das Firmenprofil und liefert eine bewertete Shortlist.

Eingabe ist ein Firmenpass:

1. Gewerk
2. Leistungsbeschreibung
3. Auftragsgröße
4. Zertifikate
5. Referenzen
6. Ausschlüsse

Ausgabe ist ein Bericht mit Übersichtstabelle und Fortschrittsbalken, als Markdown und PDF, pro Ausschreibung:

1. Punktzahl (0 bis 100)
2. Urteil: GO, GO MIT AUFLAGE oder NO-GO
3. Begründung
4. Offene To-dos vor der Abgabe
5. Risiken

Jede Ausschreibung wird vor der Ausgabe noch einmal gegen die Quelldaten geprüft. Null Treffer ist ein gültiges Ergebnis.

Fehlen im Profil Referenzen oder Zertifikate, kann JuicyBids selbst einen Recherche-Agenten aus der Sokosumi-Galerie beauftragen und bezahlen, der die Firma recherchiert. Die Funde füllen nur Lücken und sind im Bericht als Recherche markiert. Gebaut und getestet; in der Preprod-Galerie fehlt derzeit ein funktionierender Recherche-Agent, deshalb noch kein Live-Lauf.

## Bezahlung über Cardano

JuicyBids ist als Masumi-Agent registriert und in der Sokosumi-Galerie buchbar. Festpreis: 1 USDM pro Lauf.

1. Kunde bucht den Agenten in Sokosumi.
2. Sokosumi sperrt den Betrag im Masumi-Escrow auf Cardano.
3. JuicyBids rechnet und liefert den Bericht.
4. Der Hash des Berichts wird on-chain geschrieben.
5. Nach der Freigabefrist geht der Betrag an die Wallet von JuicyBids.

Das ist auf Preprod einmal komplett durchgelaufen, inklusive Auszahlung:

1. [Kunde zahlt 1 tUSDM in den Escrow](https://preprod.cardanoscan.io/transaction/92e32c3194fbac1c52c5c813c5f1fdd985e28d4ae3575331bb6efd36ae6ebb79)
2. [Hash des Berichts geht on-chain](https://preprod.cardanoscan.io/transaction/e3bfe72f48d969287ccd72374a51f7b72823c38d2ddd6d53a52c5e967abf2c01)
3. [1 tUSDM geht an JuicyBids](https://preprod.cardanoscan.io/transaction/831aa9787a6a6bf0c39478ca49ec71ad5c7206c5b5563efedfd90152c517e279)

 Alle Transaktionen: [docs/tickets/T13/beleg.md](docs/tickets/T13/beleg.md). Kasse: [docs/einnahmen.md](docs/einnahmen.md).

## Wie es funktioniert

```
Firmenpass
  → Vorfilter       Region, Frist, CPV-Code, Auftragswert   (Code)
  → Bewertung       Eignung, Leistbarkeit, Wirtschaftlichkeit, Risiko   (Modell)
  → Gegenprüfung    jeder Treffer gegen die Quelldaten   (Code)
  → Bericht         deutsch, mit SHA-256-Hash
```

Fakten wie Titel, Auftraggeber, Frist, Wert und Link kommen immer aus den Daten. Das Modell liefert nur das Urteil und überschreibt nie einen Fakt.

Daten: der offene Export des Datenservice Öffentlicher Einkauf (CC0). Der Prototyp ist mit Bayern geladen, der Import funktioniert für jede Region in Deutschland.

## Ausführen

Voraussetzungen: Node.js 24, ein OpenAI-API-Key.

```sh
npm ci
cp .env.example .env        # OPENAI_API_KEY und OPENAI_MODEL eintragen
npm test
```

Ohne Modell, sofort:

```sh
npm run scout -- examples/p1-alpendach.pass.json --offline          # Bericht im Terminal
npm run scout -- examples/p3-isarcode.pass.json --offline --pdf     # dazu Markdown und PDF in .local/
```

Mit Modell (zwei Terminals):

```sh
npm start                                           # Terminal 1
npm run scout -- examples/p3-isarcode.pass.json     # Terminal 2, ca. 2 Minuten
npm run eval                                        # alle Testfälle
```

Über Sokosumi (Preprod, Sokosumi-CLI 1.1.0):

```sh
sokosumi --preprod agents hire 01a18f8f-7091-74ae-88a7-8b4856955f83 --input-file anfrage.json --max-credits 100 --json
sokosumi --preprod jobs get <JOB_ID> --json
```

`anfrage.json` enthält `{"prompt": "<Firmenpass-JSON oder Beschreibung der Firma>"}`. Beispiele liegen in [examples/](examples/).

## Testergebnisse

Drei fiktive Firmen, acht erwartete Urteile. Vier Live-Läufe am 31.10.: 8 von 8, 7 von 8, 8 von 8, 8 von 8. Der eine Fehler war ein Grenzfall knapp an der GO-Schwelle, der mit einem vollständigeren Firmenprofil verschwand. Details: [docs/tickets/T11/abweichungen.md](docs/tickets/T11/abweichungen.md).

## Grenzen

- Unterhalb der EU-Schwellenwerte veröffentlichen nicht alle Vergabestellen im Export, die Abdeckung ist dort lückenhaft.
- Modellantworten schwanken leicht. Grenzfälle können zwischen GO und GO MIT AUFLAGE kippen.
- Nur Preprod, kein echtes Geld.

## Repo

- [agent-api.mjs](agent-api.mjs): MIP-003-API für bezahlte Jobs
- [agent/instructions.md](agent/instructions.md): Bewertungskriterien
- [tender/](tender/): Pipeline
- [data/](data/): Import und Datensatz
- [examples/](examples/): Testfirmen und erwartete Urteile
- [docs/](docs/): Belege

Code: MIT. Daten: CC0.
