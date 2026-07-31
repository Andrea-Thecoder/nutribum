# Changelog

Tutte le modifiche rilevanti a NutriBum sono documentate in questo file.

Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.1.0/),
e il progetto usa [Semantic Versioning](https://semver.org/lang/it/).

## [Unreleased]

### Aggiunto
- Auto-update: da File → Impostazioni, "Cerca aggiornamenti" (manuale) e "Aggiornamenti automatici" (controllo ad ogni avvio, disattivato di default) - entrambi avvisano che serve una connessione a internet e che nessun dato dell'app viene inviato online, e chiedono sempre conferma prima di installare

## [0.2.2]

### Aggiunto
- Workflow GitHub Actions per build automatiche cross-platform (Windows, macOS Intel/Apple Silicon, Linux) alla creazione di un tag di release
- Licenza PolyForm Noncommercial 1.0.0
- Istruzioni di installazione nel README per Windows (SmartScreen), macOS (Gatekeeper) e Linux (AppImage)
- Configurazione separata per lo sviluppo (`tauri.dev.conf.json`), con identifier dedicato per non mescolare i dati di test con quelli di una build installata
- Metadati del pacchetto (descrizione, categoria, copyright, maintainer) per gli installer Linux/macOS

### Sicurezza
- Content Security Policy configurata (prima disattivata)
- Firma ad-hoc per le build macOS
