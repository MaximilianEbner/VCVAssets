# VCV Assets Datenbank Web-Anwendung
from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_cors import CORS
import pandas as pd
import os
import json
from datetime import datetime
import uuid

app = Flask(__name__)
CORS(app)

# Konfiguration
UPLOAD_FOLDER = 'static/images'
EXCEL_FILE = 'Datenbank_VCV_Assets.xlsx'
DATA_FILE = 'data.json'

# Ordner erstellen falls nicht vorhanden
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

class VCVDatabase:
    def __init__(self):
        self.load_data()
    
    def load_data(self):
        """Lädt Daten aus Excel oder JSON"""
        try:
            if os.path.exists(EXCEL_FILE):
                self.df = pd.read_excel(EXCEL_FILE)
                # NaN-Werte durch leere Strings ersetzen
                self.df = self.df.fillna('')
                # Konvertiere zu Dictionary für einfachere Handhabung
                self.data = self.df.to_dict('records')
                
                # Füge IDs hinzu, falls nicht vorhanden
                for i, item in enumerate(self.data):
                    if 'id' not in item or not item['id']:
                        item['id'] = i + 1
                    if 'status' not in item:
                        item['status'] = 'lagernd'
                        
            elif os.path.exists(DATA_FILE):
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    self.data = json.load(f)
            else:
                self.data = []
                
            print(f"Daten geladen: {len(self.data)} Einträge")
        except Exception as e:
            print(f"Fehler beim Laden der Daten: {e}")
            self.data = []
    
    def save_data(self):
        """Speichert Daten in JSON"""
        try:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Fehler beim Speichern: {e}")
    
    def search_parts(self, query=""):
        """Sucht nach Teilen"""
        if not query:
            return self.data
        
        results = []
        query_lower = query.lower()
        
        for item in self.data:
            # Durchsuche alle Felder nach dem Suchbegriff
            for key, value in item.items():
                if str(value).lower().find(query_lower) != -1:
                    results.append(item)
                    break
        
        return results
    
    def update_status(self, item_id, new_status):
        """Aktualisiert den Status eines Teils"""
        for item in self.data:
            if str(item.get('id', '')) == str(item_id):
                item['status'] = new_status
                item['last_updated'] = datetime.now().isoformat()
                self.save_data()
                return True
        return False
    
    def add_image(self, item_id, image_path):
        """Fügt ein Bild zu einem Teil hinzu"""
        for item in self.data:
            if str(item.get('id', '')) == str(item_id):
                if 'images' not in item:
                    item['images'] = []
                item['images'].append(image_path)
                self.save_data()
                return True
        return False

# Globale Datenbank-Instanz
db = VCVDatabase()

@app.route('/')
def index():
    """Hauptseite"""
    return render_template('index.html')

@app.route('/api/search')
def api_search():
    """API für Teilsuche"""
    try:
        query = request.args.get('q', '')
        results = db.search_parts(query)
        return jsonify(results)
    except Exception as e:
        print(f"Fehler bei der Suche: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/parts')
def api_parts():
    """API für alle Teile"""
    return jsonify(db.data)

@app.route('/api/update_status', methods=['POST'])
def api_update_status():
    """API für Status-Update"""
    data = request.json
    item_id = data.get('id')
    new_status = data.get('status')
    
    if db.update_status(item_id, new_status):
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': 'Teil nicht gefunden'})

@app.route('/api/upload_image', methods=['POST'])
def api_upload_image():
    """API für Bild-Upload"""
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'Kein Bild hochgeladen'})
    
    file = request.files['image']
    item_id = request.form.get('item_id')
    
    if file.filename == '':
        return jsonify({'success': False, 'error': 'Keine Datei ausgewählt'})
    
    if file and item_id:
        # Eindeutigen Dateinamen generieren
        filename = f"{uuid.uuid4()}_{file.filename}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        # Relativen Pfad speichern
        relative_path = f"images/{filename}"
        
        if db.add_image(item_id, relative_path):
            return jsonify({'success': True, 'image_path': relative_path})
        else:
            return jsonify({'success': False, 'error': 'Teil nicht gefunden'})
    
    return jsonify({'success': False, 'error': 'Unbekannter Fehler'})

@app.route('/api/analytics')
def api_analytics():
    """API für Analysen"""
    status_counts = {}
    total_items = len(db.data)
    
    # Status-Verteilung
    for item in db.data:
        status = item.get('status', 'Unbekannt')
        status_counts[status] = status_counts.get(status, 0) + 1
    
    analytics = {
        'total_items': total_items,
        'status_distribution': status_counts,
        'last_updated': datetime.now().isoformat()
    }
    
    return jsonify(analytics)

if __name__ == '__main__':
    print("Starte VCV Assets Datenbank...")
    print("Öffne http://localhost:5000 im Browser")
    # Port für Railway/Cloud-Deployment
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
