# VCV Assets Database - Customer Version

Eine kundenspezifische Version der VCV Assets Datenbank für Railway Deployment.

## Features

### 🔒 Benutzerrollen
- **Admin**: Vollzugriff auf alle Funktionen, Customer Management
- **Viewer**: Vollzugriff auf Daten, kann bearbeiten aber nicht verwalten
- **Customer**: Eingeschränkter Zugriff nur auf zugewiesene Teile

### 🚫 Customer-Einschränkungen
Customer User sehen keine:
- Preisinformationen (Piece cost, Purchase total, Target value)
- Kommentare 
- QTY per truck
- Weight per part / Weight in total
- Bearbeitungsfunktionen (nur Ansicht)

### 📋 Customer Management
- Upload von Teilelisten (.txt oder .csv)
- Individuelle Zuweisungen pro Customer
- Automatische Benutzer-Erstellung

## Railway Deployment

### 1. Repository vorbereiten
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Railway Setup
1. Account bei [Railway.app](https://railway.app) erstellen
2. "New Project" → "Deploy from GitHub repo"
3. Repository auswählen
4. Automatisches Deployment startet

### 3. Umgebungsvariablen (optional)
```
SECRET_KEY=your-secret-key-here
PORT=5000
```

### 4. Domain konfigurieren
- Unter Settings → Domains
- Custom Domain hinzufügen

## Lokale Installation

```bash
pip install -r requirements.txt
python app.py
```

## Customer Management

### Neuen Customer erstellen
1. Als Admin anmelden
2. "Customer Management" aufrufen
3. Customer-Daten eingeben
4. Teileliste hochladen (.txt oder .csv)
5. Customer-User erstellen

### Teilelisten-Format

**TXT-Format:**
```
C1000008-AA
C1000009-AA
P1000383-AC
```

**CSV-Format:**
```
Part Number,Description
C1000008-AA,Chassis Frame
C1000009-AA,Chassis Frame RH
```

## Standard-Zugangsdaten

### Admin
- **Benutzername**: admin
- **Passwort**: vcv2025

### Viewer  
- **Benutzername**: viewer
- **Passwort**: viewer

## API Endpoints

- `GET /api/parts` - Alle erlaubten Teile
- `GET /api/search?q=query` - Teilsuche
- `POST /api/upload_customer_parts` - Customer-Teileliste upload (Admin)
- `POST /api/customers/{id}/users` - Customer-User erstellen (Admin)

## Sicherheit

- Passwort-Hashing mit PBKDF2
- Session-Management
- Rollenbasierte Zugriffskontrolle
- Customer-spezifische Datenfilterung

## Support

Bei Fragen zur Einrichtung oder Nutzung wenden Sie sich an das VCV Assets Team.
