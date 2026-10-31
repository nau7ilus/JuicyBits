# Einnahmen (Preprod)

Was JuicyBids pro bezahltem Job tatsächlich bekommen hat. Nur gemessene Werte aus `npm run receipt -- <MIP-003-Job-ID>` (MPS-Status plus Blockfrost-UTxOs der Withdraw-Tx). Die rohen JSON-Belege liegen in `.local/receipts.jsonl` (nicht im Repo); die Zeile hier wird von Hand nachgetragen.

Preis: fest 1 tUSDM (100 Sokosumi-Credits) pro Job. Der Contract kennt nur vollen Withdraw oder vollen Refund. In tUSDM wird nichts abgezogen; die Tx-Gebühr der Auszahlung zahlt die Selling Wallet in tADA.

| Datum | Sokosumi-Job | MIP-003-Job | Käufer | Preis | Netto tUSDM an Selling Wallet | tADA-Saldo der Selling Wallet in der Withdraw-Tx | Withdraw-Tx | Geprüft |
|---|---|---|---|---|---|---|---|---|
| 31.10.2026, 02:39–03:26 | `01a18f9c-a001-7131-8f2e-e07480950460` | `a2f61167-9885-4a90-a64b-358a75608020` | Sokosumi (Galerie, 100 Credits) | 1 tUSDM | **+1,000000** | −3,639147 (Gebühr 0,673627; 4,469470 zurück an den Käufer) | `831aa9787a6a6bf0c39478ca49ec71ad5c7206c5b5563efedfd90152c517e279` | 31.10., 10:52 |

Summe: 1,000000 tUSDM aus 1 Job.

## So kommt eine neue Zeile dazu
1. Job-ID aus `.local/standard-jobs/` nehmen (eine Datei pro bezahltem Job).
2. Frühestens nach `unlockTime` (ca. 36 min nach dem Lock): `npm run receipt -- <jobId>`. Exit 0 heißt belegt, Exit 2 heißt noch nicht ausgezahlt.
3. `netUSDM` und `withdrawTxHash` aus der Ausgabe hier eintragen; die Ausgabe hängt der Befehl selbst an `.local/receipts.jsonl` an.

Selling Wallet: `addr_test1qzu2tvcjw02rx2v0qu9w9685rd4yld8a8wnkmv7f8707372dxevnevt2892fv2yqp4x40amq655fawu9hhx9vrrymfrsees0gh` (Preprod, kein echtes Geld).
