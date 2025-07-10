# VCV Assets Datenbank Web-Anwendung
from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from flask_cors import CORS
import pandas as pd
import os
import json
from datetime import datetime
import uuid
import secrets

app = Flask(__name__)
CORS(app)

# Session-Konfiguration
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(24))
app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 Stunden

# Import Auth Module
try:
    from auth import AuthManager, login_required, admin_required
    auth_manager = AuthManager()
except ImportError:
    print("Auth module nicht gefunden - Login deaktiviert")
    auth_manager = None

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
                print(f"Geladen: {len(self.data)} Einträge aus data.json")
            elif os.path.exists('sample_data.json'):
                # Fallback für Production (Railway) - verwende sample_data.json
                with open('sample_data.json', 'r', encoding='utf-8') as f:
                    self.data = json.load(f)
                print(f"Verwende sample_data.json für Production: {len(self.data)} Einträge")
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

# Login Routen
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if auth_manager:
            user = auth_manager.authenticate(username, password)
            if user:
                session['user'] = user
                session.permanent = True
                flash(f'Willkommen, {user["name"]}!', 'success')
                next_page = request.args.get('next')
                return redirect(next_page) if next_page else redirect(url_for('dashboard'))
            else:
                flash('Ungültiger Benutzername oder Passwort!', 'error')
        else:
            flash('Login-System nicht verfügbar!', 'error')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('Sie wurden erfolgreich abgemeldet.', 'success')
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    return redirect(url_for('index'))

# Hauptrouten mit Login-Schutz
@app.route('/')
@login_required
def index():
    """Hauptseite mit Teile-Übersicht"""
    user = session.get('user', {})
    return render_template('index.html', user=user)

@app.route('/api/search')
@login_required
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
@login_required
def api_parts():
    """API für alle Teile"""
    return jsonify(db.data)

@app.route('/api/update_status', methods=['POST'])
@login_required
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
@login_required
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

@app.route('/api/upload_multiple_images', methods=['POST'])
@login_required
def api_upload_multiple_images():
    """API für mehrere Bild-Uploads"""
    if 'images' not in request.files:
        return jsonify({'success': False, 'error': 'Keine Bilder hochgeladen'})
    
    files = request.files.getlist('images')
    item_id = request.form.get('item_id')
    
    if not files or len(files) == 0:
        return jsonify({'success': False, 'error': 'Keine Dateien ausgewählt'})
    
    if len(files) > 5:
        return jsonify({'success': False, 'error': 'Maximal 5 Bilder erlaubt'})
    
    if not item_id:
        return jsonify({'success': False, 'error': 'Keine Teil-ID angegeben'})
    
    uploaded_files = []
    uploaded_count = 0
    
    try:
        for file in files:
            if file and file.filename != '':
                # Eindeutigen Dateinamen generieren
                filename = f"{uuid.uuid4()}_{file.filename}"
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                
                # Datei speichern
                file.save(filepath)
                
                # Relativen Pfad speichern
                relative_path = f"images/{filename}"
                uploaded_files.append(relative_path)
                
                # Bild zum Teil hinzufügen
                if db.add_image(item_id, relative_path):
                    uploaded_count += 1
                else:
                    # Bei Fehler: bereits gespeicherte Datei löschen
                    try:
                        os.remove(filepath)
                    except:
                        pass
        
        if uploaded_count > 0:
            return jsonify({
                'success': True, 
                'uploaded_count': uploaded_count,
                'image_paths': uploaded_files[:uploaded_count]
            })
        else:
            return jsonify({'success': False, 'error': 'Teil nicht gefunden oder Fehler beim Speichern'})
            
    except Exception as e:
        return jsonify({'success': False, 'error': f'Fehler beim Upload: {str(e)}'})

@app.route('/api/analytics')
@login_required
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

@app.route('/user_management', methods=['GET', 'POST'])
@login_required
@admin_required
def user_management():
    """Benutzerverwaltung für Admins"""
    if request.method == 'POST':
        action = request.form.get('action')
        
        if action == 'add_user':
            username = request.form.get('username')
            name = request.form.get('name')
            password = request.form.get('password')
            role = request.form.get('role')
            
            if auth_manager.add_user(username, password, role, name):
                flash(f'Benutzer "{username}" wurde erfolgreich hinzugefügt!', 'success')
            else:
                flash(f'Benutzer "{username}" existiert bereits!', 'error')
        
        elif action == 'delete_user':
            username = request.form.get('username')
            if username and username != session['user']['username']:
                if username in auth_manager.users:
                    del auth_manager.users[username]
                    auth_manager.save_users()
                    flash(f'Benutzer "{username}" wurde gelöscht!', 'success')
                else:
                    flash(f'Benutzer "{username}" nicht gefunden!', 'error')
            else:
                flash('Sie können sich nicht selbst löschen!', 'error')
        
        return redirect(url_for('user_management'))
    
    return render_template('user_management.html', 
                         users=auth_manager.users, 
                         current_user=session['user'])

@app.route('/api/delete_image', methods=['POST'])
@login_required
def api_delete_image():
    """API für Bild-Löschung"""
    data = request.json
    item_id = data.get('item_id')
    image_path = data.get('image_path')
    
    if not item_id or not image_path:
        return jsonify({'success': False, 'error': 'Fehlende Parameter'})
    
    try:
        # Finde das Teil und entferne das Bild
        for item in db.data:
            if str(item.get('id', '')) == str(item_id):
                if 'images' in item and image_path in item['images']:
                    # Entferne aus der Datenbank
                    item['images'].remove(image_path)
                    
                    # Lösche die physische Datei
                    full_path = os.path.join('static', image_path)
                    if os.path.exists(full_path):
                        try:
                            os.remove(full_path)
                        except Exception as e:
                            print(f"Warnung: Datei konnte nicht gelöscht werden: {e}")
                    
                    # Speichere Änderungen
                    db.save_data()
                    return jsonify({'success': True})
                else:
                    return jsonify({'success': False, 'error': 'Bild nicht gefunden'})
        
        return jsonify({'success': False, 'error': 'Teil nicht gefunden'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': f'Fehler beim Löschen: {str(e)}'})

if __name__ == '__main__':
    print("Starte VCV Assets Datenbank...")
    print("Öffne http://localhost:5000 im Browser")
    # Port für Railway/Cloud-Deployment
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
