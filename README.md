# VCV Assets Datenbank

Eine webbasierte Anwendung zur Verwaltung von VCV Assets mit Bildupload, Statusverfolgung und Benutzerverwaltung.

## 🚀 Schnellstart für neue Benutzer

### Option 1: Vollautomatisch (Empfohlen)
```
Doppelklick auf: setup_und_start.bat
```
- Installiert automatisch Python und alle Abhängigkeiten
- Startet die Anwendung
- Öffnet den Browser automatisch

### Option 2: PowerShell (Robuster)
```
Rechtsklick auf: setup_und_start.ps1 → "Mit PowerShell ausführen"
```
- Erweiterte Fehlerbehandlung
- Bessere Admin-Rechte-Verwaltung

### Option 3: Einfacher Start (Python bereits installiert)
```
Doppelklick auf: start_einfach.bat
```

## � Wichtige Dateien

| Datei | Zweck |
|-------|-------|
| `setup_und_start.bat` | Vollautomatische Installation und Start |
| `setup_und_start.ps1` | PowerShell-Version (robuster) |
| `start_einfach.bat` | Start bei vorhandenem Python |
| `desktop_verknuepfung.bat` | Erstellt Desktop-Symbol |
| `SCHNELLSTART.md` | Detaillierte Anleitung für Einsteiger |
| `BENUTZERHANDBUCH.md` | Vollständige Dokumentation |

## 🌐 Zugriff

Nach dem Start ist die Anwendung verfügbar unter:
- **URL:** http://localhost:5000
- **Login:** Wird beim ersten Start eingerichtet

## 📋 Systemanforderungen

- Windows 10/11
- 4 GB RAM
- 1 GB freier Speicherplatz
- Internetverbindung (nur für Installation)

- **Backend**: Python Flask
- **Frontend**: HTML5, Bootstrap 5, JavaScript
- **Database**: JSON/Excel
- **Deployment**: Railway
- **Styling**: Bootstrap + Custom CSS
- **Icons**: Font Awesome

## � Deployment

### Railway Deployment
1. Fork dieses Repository
2. Verbinde dein GitHub mit Railway
3. Deploy direkt von GitHub
4. Die App wird automatisch gestartet

### Lokale Installation

### Schnellstart:
```cmd
python start.py
```

### Manueller Start:
1. Pakete installieren:
   ```cmd
   pip install -r requirements.txt
   ```

2. Anwendung starten:
   ```cmd
   python app.py
   ```

3. Browser öffnen: http://localhost:5000

## 📲 Handy-Zugriff

Für den Zugriff vom Handy:

1. PC und Handy müssen im gleichen WLAN sein
2. PC-IP-Adresse ermitteln:
   ```cmd
   ipconfig
   ```
3. Auf dem Handy öffnen: `http://[DEINE-IP]:5000`

## 📊 Datenbank

Die Anwendung kann mit Ihrer bestehenden Excel-Datei `Datenbank_VCV_Assets.xlsx` arbeiten oder eine neue JSON-basierte Datenbank erstellen.

### Unterstützte Datenfelder:
- Name/Bezeichnung
- Beschreibung
- Kategorie
- Status (lagernd, verkauf gestartet, verkauft, teilweise verkauft)
- Bilder
- Beliebige weitere Felder aus der Excel-Datei

## 🔧 Status-Optionen

- **Lagernd**: Teil ist verfügbar
- **Verkauf gestartet**: Teil ist zum Verkauf ausgeschrieben
- **Verkauft**: Teil wurde verkauft
- **Teilweise verkauft**: Teil wurde nur teilweise verkauft

## 📸 Foto-Upload

- Unterstützt alle gängigen Bildformate
- Optimiert für Handy-Kamera
- Automatische Größenanpassung
- Sichere Dateispeicherung

## 🔮 Zukünftige Erweiterungen

Die modulare Architektur ermöglicht einfache Erweiterungen:

- **Benutzer-Management**: Login-System
- **Verkaufs-Tracking**: Preise und Verkaufshistorie
- **Export-Funktionen**: PDF-Berichte, Excel-Export
- **Barcode-Scanner**: QR-Code Integration
- **Benachrichtigungen**: E-Mail-Alerts
- **API-Integration**: Anbindung an Verkaufsplattformen

## 📁 Datei-Struktur

```
VCV_Assets/
├── app.py                 # Haupt-Flask-Anwendung
├── start.py              # Starter-Script
├── requirements.txt      # Python-Abhängigkeiten
├── templates/
│   └── index.html        # HTML-Template
├── static/
│   ├── app.js           # Frontend-JavaScript
│   └── images/          # Hochgeladene Bilder
├── Datenbank_VCV_Assets.xlsx  # Ihre Excel-Datei
└── data.json            # JSON-Datenbank (automatisch erstellt)
```

## 🛠 Technologie-Stack

- **Backend**: Python Flask
- **Frontend**: HTML5, Bootstrap 5, JavaScript
- **Datenbank**: JSON/Excel
- **Styling**: Bootstrap + Custom CSS
- **Icons**: Font Awesome

## 📞 Support

Bei Problemen oder Fragen zur Anwendung können die Log-Ausgaben in der Konsole hilfreich sein.

## 🔒 Sicherheit

- Sichere Datei-Uploads
- Input-Validierung
- CORS-Schutz
- Lokaler Betrieb (keine Cloud-Abhängigkeit)

## 🔐 Login-System

### Standard-Benutzer:
- **Admin**: `admin` / `vcv2025`
  - Vollzugriff auf alle Funktionen
  - Kann Benutzer verwalten
  - Kann Teil-Status ändern
  
- **Viewer**: `viewer` / `viewer`
  - Nur Lesezugriff
  - Kann suchen und Daten anzeigen

### Sicherheit:
- Sichere Password-Hashing (PBKDF2)
- Session-basierte Authentifizierung
- Rollenverwaltung (Admin/Viewer)
- Automatische Session-Verwaltung
