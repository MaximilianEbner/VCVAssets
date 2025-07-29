# VCV Assets Datenbank Web-Anwendung
from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash, send_from_directory
from flask_cors import CORS
import pandas as pd
import os
import json
from datetime import datetime
import uuid
import secrets
import csv
import cloudinary
import cloudinary.uploader
import cloudinary.api

app = Flask(__name__)
CORS(app)

# Session-Konfiguration
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(24))
app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 Stunden

# Import Auth Module
try:
    from auth import AuthManager, login_required, admin_required, customer_allowed
    auth_manager = AuthManager()
except ImportError:
    print("Auth module nicht gefunden - Login deaktiviert")
    auth_manager = None

# Konfiguration - Verwendet das aktuelle Verzeichnis der Anwendung
SHARED_BASE_PATH = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(SHARED_BASE_PATH, 'static', 'images')
EXCEL_FILE = os.path.join(SHARED_BASE_PATH, 'Datenbank_VCV_Assets.xlsx')
DATA_FILE = os.path.join(SHARED_BASE_PATH, 'data.json')
SYSTEM_STOCK_FILE = os.path.join(SHARED_BASE_PATH, 'Systembestand_StA.csv')

# Cloudinary-Konfiguration
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME', 'dwdjbldcg'),
    api_key=os.environ.get('CLOUDINARY_API_KEY', '197529524277377'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET', 'csZZwUPt4SE9x0wVrj2MlrHwjVI')
)

# Ordner erstellen falls nicht vorhanden
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(SHARED_BASE_PATH, exist_ok=True)

def upload_image_to_cloudinary(file, part_number):
    """Upload image to Cloudinary"""
    try:
        # Create folder structure: vcv-assets/part-number/
        folder = f"vcv-assets/{part_number}"
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type="image",
            format="jpg",  # Convert all to JPG for consistency
            quality="auto:good",  # Optimize file size
            fetch_format="auto"  # Auto-optimize format for browsers
        )
        
        return result['secure_url']  # Return HTTPS URL
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        return None

def get_cloudinary_images_for_part(part_number):
    """Get all images for a part number from Cloudinary"""
    try:
        # Search for images in the vcv-assets/part-number folder
        folder = f"vcv-assets/{part_number}"
        
        # Use Cloudinary API to list resources in the folder
        result = cloudinary.api.resources(
            type="upload",
            prefix=folder,
            resource_type="image",
            max_results=100  # Adjust if you expect more than 100 images per part
        )
        
        # Extract secure URLs from the results
        image_urls = []
        for resource in result.get('resources', []):
            image_urls.append(resource['secure_url'])
        
        print(f"Found {len(image_urls)} images for part {part_number} in Cloudinary")
        return image_urls
        
    except Exception as e:
        print(f"Error fetching images from Cloudinary for {part_number}: {e}")
        return []

class VCVDatabase:
    def __init__(self):
        self.load_data()
    
    def load_data(self):
        """Lädt Daten aus JSON (data.json), nur initial aus Excel"""
        try:
            if os.path.exists(DATA_FILE):
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    self.data = json.load(f)
                print(f"Geladen: {len(self.data)} Einträge aus data.json")
            elif os.path.exists(EXCEL_FILE):
                self.df = pd.read_excel(EXCEL_FILE)
                self.df = self.df.fillna('')
                column_rename_map = {
                    'Inventory calculated (Steyr inventory - Loadbox - Qzone - verbaut nicht backflushed- VERSAND):': 'Inventory calculated'
                }
                self.df.rename(columns=column_rename_map, inplace=True)
                self.data = self.df.to_dict('records')
                for i, item in enumerate(self.data):
                    if 'id' not in item or not item['id']:
                        item['id'] = i + 1
                    if 'status' not in item:
                        item['status'] = 'lagernd'
                # Nach erstem Import direkt in data.json speichern
                self.save_data()
                print(f"Initialimport aus Excel: {len(self.data)} Einträge -> data.json gespeichert")
            elif os.path.exists(os.path.join(SHARED_BASE_PATH, 'sample_data.json')):
                with open(os.path.join(SHARED_BASE_PATH, 'sample_data.json'), 'r', encoding='utf-8') as f:
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
    
    def search_parts(self, query="", allowed_parts=None):
        """Sucht nach Teilen mit optionaler Filterung für Customer"""
        data_to_search = self.data
        
        # Filtere Daten für Customer User
        if allowed_parts is not None:
            data_to_search = [
                item for item in self.data 
                if item.get('Part number') in allowed_parts
            ]
        
        if not query:
            return data_to_search
        
        results = []
        query_lower = query.lower()
        
        for item in data_to_search:
            # Durchsuche alle Felder nach dem Suchbegriff
            for key, value in item.items():
                if str(value).lower().find(query_lower) != -1:
                    results.append(item)
                    break
        
        return results
    
    def filter_customer_data(self, data, user_role):
        """Filtert sensible Daten für Customer User"""
        if user_role == 'customer':
            # Entferne sensible Felder für Customer
            sensitive_fields = [
                'Piece cost (€)', 
                'Purchase total (€)', 
                'Target value',
                'QTY per truck (MS - Metro spec)',
                'Weight per part (EBOM)',
                'Weight in total',
                'comment'
            ]
            
            filtered_data = []
            for item in data:
                filtered_item = {}
                for key, value in item.items():
                    if key not in sensitive_fields:
                        filtered_item[key] = value
                filtered_data.append(filtered_item)
            return filtered_data
        
        return data
    
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

# Systembestand CSV laden
system_stock_data = []
if os.path.exists(SYSTEM_STOCK_FILE):
    try:
        # Robust: Pandas erkennt Encoding und Trennzeichen automatisch
        df_stock = pd.read_csv(SYSTEM_STOCK_FILE, sep=None, engine='python')
        # Spaltennamen bereinigen (BOM, Leerzeichen, Anführungszeichen entfernen)
        cleaned_cols = [col.replace('\ufeff', '').replace("'", '').strip() for col in df_stock.columns]
        # Doppelte Spaltennamen entfernen (nur erste Instanz behalten)
        seen = set()
        unique_cols = []
        for idx, col in enumerate(cleaned_cols):
            if col not in seen:
                seen.add(col)
                unique_cols.append((col, idx))
        # Reindexiere DataFrame auf eindeutige Spalten
        df_stock.columns = cleaned_cols
        df_stock = df_stock.iloc[:, [idx for (_, idx) in unique_cols]]
        print(f"Systembestand geladen: {len(df_stock)} Einträge (pandas)")
        print("Spaltennamen der CSV (repr):", [repr(col) for (col, _) in unique_cols])
        print("Erste Zeilen als dict:")
        for i, row in df_stock.head(5).iterrows():
            print({k: repr(v) for k, v in row.items()})
        # Nur relevante Spalten übernehmen und Zeilen ohne VOLTAITEM ignorieren
        needed_cols = ['VOLTAITEM', 'IST-Bestand', 'Ort']
        for col in needed_cols:
            if col not in df_stock.columns:
                print(f"Warnung: Spalte '{col}' fehlt in der CSV!")
        available_cols = [col for col in needed_cols if col in df_stock.columns]
        df_stock = df_stock[available_cols].fillna('')
        # Anführungszeichen aus den Werten der relevanten Spalten entfernen
        for col in available_cols:
            df_stock[col] = df_stock[col].astype(str).str.replace("'", '').str.strip()
        # Zeilen ohne VOLTAITEM ignorieren
        if 'VOLTAITEM' in df_stock.columns:
            df_stock = df_stock[df_stock['VOLTAITEM'].astype(str).str.strip() != '']
        else:
            print("Fehler: Spalte 'VOLTAITEM' nicht gefunden nach Bereinigung!")
        system_stock_data = df_stock.to_dict('records')
    except Exception as e:
        print(f"Fehler beim Laden von Systembestand_StA.csv (pandas): {e}")
        system_stock_data = []
else:
    print("Systembestand_StA.csv nicht gefunden.")

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

# Statische Route für Bilder im geteilten Pfad
@app.route('/static/images/<path:filename>')
def serve_shared_images(filename):
    """Serviert Bilder aus dem geteilten Pfad"""
    return send_from_directory(UPLOAD_FOLDER, filename)

# Hauptrouten mit Login-Schutz
@app.route('/')
@customer_allowed
def index():
    """Hauptseite mit Teile-Übersicht"""
    user = session.get('user', {})
    return render_template('index.html', user=user)

@app.route('/customer-management')
@admin_required
def customer_management():
    """Customer Management Interface (nur Admin)"""
    user = session.get('user', {})
    return render_template('customer_management.html', user=user)

@app.route('/api/search')
@customer_allowed
def api_search():
    """API für Teilsuche mit Customer-Filtering"""
    try:
        query = request.args.get('q', '')
        user = session.get('user', {})
        
        # Bestimme erlaubte Teile für den User
        allowed_parts = None
        if auth_manager and user.get('username'):
            allowed_parts = auth_manager.get_allowed_parts_for_user(user['username'])
        
        # Suche mit optionaler Filterung
        results = db.search_parts(query, allowed_parts)
        
        # Filtere sensible Daten für Customer User
        results = db.filter_customer_data(results, user.get('role', 'customer'))
        
        return jsonify(results)
    except Exception as e:
        print(f"Fehler bei der Suche: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/parts')
@customer_allowed
def api_parts():
    """API für alle Teile mit Customer-Filtering"""
    try:
        user = session.get('user', {})
        
        # Bestimme erlaubte Teile für den User
        allowed_parts = None
        if auth_manager and user.get('username'):
            allowed_parts = auth_manager.get_allowed_parts_for_user(user['username'])
        
        # Filtere Daten basierend auf erlaubten Teilen
        if allowed_parts is not None:
            results = [
                item for item in db.data 
                if item.get('Part number') in allowed_parts
            ]
        else:
            results = db.data
        
        # Filtere sensible Daten für Customer User
        results = db.filter_customer_data(results, user.get('role', 'customer'))
        
        return jsonify(results)
    except Exception as e:
        print(f"Fehler beim Laden der Teile: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/update_status', methods=['POST'])
@login_required
def api_update_status():
    """API für Status-Update - nur für Admin/Viewer"""
    user = session.get('user', {})
    if user.get('role') == 'customer':
        return jsonify({'success': False, 'error': 'Keine Berechtigung für Status-Updates'}), 403
    
    data = request.json
    item_id = data.get('id')
    new_status = data.get('status')
    
    if db.update_status(item_id, new_status):
        print(f"Status-Update: Teil-ID {item_id} -> Status '{new_status}'")
        return jsonify({'success': True})
    else:
        print(f"Status-Update fehlgeschlagen: Teil-ID {item_id} nicht gefunden")
        return jsonify({'success': False, 'error': 'Teil nicht gefunden'})

@app.route('/api/upload_image', methods=['POST'])
@login_required
def api_upload_image():
    """API für Bild-Upload mit Cloudinary - nur für Admin/Viewer"""
    user = session.get('user', {})
    if user.get('role') == 'customer':
        return jsonify({'success': False, 'error': 'Keine Berechtigung für Bild-Uploads'}), 403
    
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'Kein Bild hochgeladen'})
    
    file = request.files['image']
    item_id = request.form.get('item_id')
    
    if file.filename == '':
        return jsonify({'success': False, 'error': 'Keine Datei ausgewählt'})
    
    if file and item_id:
        # Hole die Part Number für das Teil
        part_number = None
        for item in db.data:
            if str(item.get('id', '')) == str(item_id):
                part_number = item.get('Part number') or item.get('name') or item.get('Bezeichnung') or str(item_id)
                break
        
        if not part_number:
            part_number = str(item_id)
        
        # Upload to Cloudinary
        cloudinary_url = upload_image_to_cloudinary(file, part_number)
        
        if cloudinary_url and db.add_image(item_id, cloudinary_url):
            print(f"Cloudinary-Upload: Teil-ID {item_id}, URL {cloudinary_url}")
            return jsonify({'success': True, 'image_path': cloudinary_url})
        else:
            print(f"Cloudinary-Upload fehlgeschlagen: Teil-ID {item_id}")
            return jsonify({'success': False, 'error': 'Fehler beim Hochladen zu Cloudinary'})
    
    return jsonify({'success': False, 'error': 'Unbekannter Fehler'})

@app.route('/api/upload_multiple_images', methods=['POST'])
@login_required
def api_upload_multiple_images():
    """API für mehrere Bild-Uploads mit Cloudinary"""
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
    
    # Hole die Part Number für das Teil
    part_number = None
    for item in db.data:
        if str(item.get('id', '')) == str(item_id):
            part_number = item.get('Part number') or item.get('name') or item.get('Bezeichnung') or str(item_id)
            break
    
    if not part_number:
        part_number = str(item_id)
    
    uploaded_urls = []
    uploaded_count = 0
    
    # Upload zu Cloudinary
    for file in files:
        if file and file.filename != '':
            # Upload to Cloudinary instead of local storage
            cloudinary_url = upload_image_to_cloudinary(file, part_number)
            if cloudinary_url:
                uploaded_urls.append(cloudinary_url)
                # Bild zum Teil hinzufügen
                if db.add_image(item_id, cloudinary_url):
                    uploaded_count += 1
    
    if uploaded_count > 0:
        print(f"Cloudinary-Upload: Teil-ID {item_id}, {uploaded_count} Bilder")
        return jsonify({
            'success': True, 
            'uploaded_count': uploaded_count,
            'image_paths': uploaded_urls[:uploaded_count]
        })
    else:
        print(f"Cloudinary-Upload fehlgeschlagen: Teil-ID {item_id}")
        return jsonify({'success': False, 'error': 'Fehler beim Hochladen zu Cloudinary'})

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
                    full_path = os.path.join(SHARED_BASE_PATH, image_path)
                    if os.path.exists(full_path):
                        try:
                            os.remove(full_path)
                        except Exception as e:
                            print(f"Warnung: Datei konnte nicht gelöscht werden: {e}")
                    
                    # Speichere Änderungen
                    db.save_data()
                    print(f"Bild gelöscht: Teil-ID {item_id}, Bild {image_path}")
                    return jsonify({'success': True})
                else:
                    return jsonify({'success': False, 'error': 'Bild nicht gefunden'})
        
        return jsonify({'success': False, 'error': 'Teil nicht gefunden'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': f'Fehler beim Löschen: {str(e)}'})

@app.route('/api/update_comment', methods=['POST'])
@login_required
def api_update_comment():
    """API für Kommentar-, Herstellerteilenummer- und Supplier-Update"""
    data = request.json
    item_id = data.get('item_id')
    comment = data.get('comment', '').strip() if 'comment' in data else None
    manufacturer_part_number = data.get('manufacturer_part_number', None)
    supplier = data.get('supplier', None)
    
    if manufacturer_part_number is not None:
        manufacturer_part_number = manufacturer_part_number.strip()
        if len(manufacturer_part_number) > 50:
            return jsonify({'success': False, 'error': 'Herstellerteilenummer darf maximal 50 Zeichen lang sein.'})
    
    if supplier is not None:
        supplier = supplier.strip()
        if len(supplier) > 100:
            return jsonify({'success': False, 'error': 'Supplier darf maximal 100 Zeichen lang sein.'})
    
    if not item_id:
        return jsonify({'success': False, 'error': 'Keine Teil-ID angegeben'})
    
    try:
        # Finde das Teil und aktualisiere Kommentar, Herstellerteilenummer und/oder Supplier
        for item in db.data:
            if str(item.get('id', '')) == str(item_id):
                user = session.get('user', {})
                username = user.get('name', 'Unbekannt')
                updated = False
                
                if comment is not None:
                    # Kommentar mit Timestamp und Benutzer
                    if comment:
                        timestamp = datetime.now().strftime('%d.%m.%Y %H:%M')
                        item['comment'] = f"[{timestamp} - {username}] {comment}"
                    else:
                        item['comment'] = ''
                    updated = True
                
                if manufacturer_part_number is not None:
                    item['manufacturer_part_number'] = manufacturer_part_number
                    updated = True
                
                if supplier is not None:
                    item['Supplier'] = supplier
                    updated = True
                
                if updated:
                    item['last_updated'] = datetime.now().isoformat()
                    db.save_data()
                    print(f"Update: Teil-ID {item_id} durch {username}")
                    return jsonify({'success': True})
                else:
                    return jsonify({'success': False, 'error': 'Keine Änderung übergeben.'})
        
        return jsonify({'success': False, 'error': 'Teil nicht gefunden'})
    except Exception as e:
        return jsonify({'success': False, 'error': f'Fehler beim Speichern: {str(e)}'})

@app.route('/api/add_part', methods=['POST'])
@login_required
def api_add_part():
    """API für das manuelle Anlegen eines neuen Teils"""
    data = request.json or {}
    try:
        # Felder aus dem Request holen
        name = data.get('name', '').strip()
        description = data.get('description', '').strip()
        category = data.get('category', '').strip()
        status = data.get('status', 'lagernd').strip()
        supplier = data.get('supplier', '').strip()
        location = data.get('location', '').strip()
        comment = data.get('comment', '').strip()
        manufacturer_part_number = data.get('manufacturer_part_number', '').strip()
        if len(manufacturer_part_number) > 50:
            return jsonify({'success': False, 'error': 'Herstellerteilenummer darf maximal 50 Zeichen lang sein.'})
        
        if not name:
            return jsonify({'success': False, 'error': 'Name/Bezeichnung ist erforderlich.'})
        
        # Neue ID generieren
        new_id = str(uuid.uuid4())
        # Teil-Objekt erstellen
        new_part = {
            'id': new_id,
            'name': name,
            'Bezeichnung': name,
            'description': description,
            'Beschreibung': description,
            'category': category,
            'Kategorie': category,
            'status': status,
            'Supplier': supplier,
            'Lieferant': supplier,
            'Location': location,
            'Standort': location,
            'comment': comment,
            'manufacturer_part_number': manufacturer_part_number,
            'images': [],
            'last_updated': datetime.now().isoformat()
        }
        db.data.append(new_part)
        db.save_data()
        print(f"Neues Teil angelegt: ID {new_id}, Name '{name}', Herstellerteilenummer '{manufacturer_part_number}'")
        return jsonify({'success': True, 'id': new_id})
    except Exception as e:
        return jsonify({'success': False, 'error': f'Fehler beim Anlegen: {str(e)}'})

# Customer Management Routen (nur für Admins)
@app.route('/api/customers')
@admin_required
def api_get_customers():
    """API für Customer-Liste (nur Admin)"""
    if not auth_manager:
        return jsonify({'error': 'Auth-System nicht verfügbar'}), 500
    
    return jsonify(auth_manager.customer_whitelist)

@app.route('/api/customers/<customer_id>', methods=['PUT'])
@admin_required
def api_update_customer(customer_id):
    """API für Customer-Update (nur Admin)"""
    if not auth_manager:
        return jsonify({'error': 'Auth-System nicht verfügbar'}), 500
    
    try:
        data = request.get_json()
        name = data.get('name', '')
        allowed_parts = data.get('allowed_parts', [])
        description = data.get('description', '')
        
        auth_manager.update_customer_whitelist(customer_id, name, allowed_parts, description)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/customers/<customer_id>/users', methods=['POST'])
@admin_required
def api_create_customer_user(customer_id):
    """API für Customer-User-Erstellung (nur Admin)"""
    if not auth_manager:
        return jsonify({'error': 'Auth-System nicht verfügbar'}), 500
    
    try:
        data = request.get_json()
        username = data.get('username', '')
        password = data.get('password', '')
        name = data.get('name', '')
        
        success, message = auth_manager.add_customer_user(username, password, customer_id, name)
        
        if success:
            return jsonify({'success': True, 'message': message})
        else:
            return jsonify({'error': message}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload_customer_parts', methods=['POST'])
@admin_required
def api_upload_customer_parts():
    """API für Upload einer Customer-Teileliste (nur Admin)"""
    if not auth_manager:
        return jsonify({'error': 'Auth-System nicht verfügbar'}), 500
    
    try:
        customer_id = request.form.get('customer_id', '')
        customer_name = request.form.get('customer_name', '')
        description = request.form.get('description', '')
        
        if 'file' not in request.files:
            return jsonify({'error': 'Keine Datei hochgeladen'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Keine Datei ausgewählt'}), 400
        
        # Lese Teilenummern aus der Datei
        if file.filename.endswith('.txt'):
            # Textdatei - eine Teilenummer pro Zeile
            content = file.read().decode('utf-8')
            allowed_parts = [line.strip() for line in content.splitlines() if line.strip()]
        elif file.filename.endswith('.csv'):
            # CSV-Datei - erste Spalte sind Teilenummern
            content = file.read().decode('utf-8')
            reader = csv.reader(content.splitlines())
            allowed_parts = []
            for i, row in enumerate(reader):
                if row and row[0].strip():
                    part_number = row[0].strip()
                    # Überspringe Header-Zeile wenn sie "Part Number" oder ähnlich enthält
                    if i == 0 and part_number.lower() in ['part number', 'partnumber', 'part_number', 'teilenummer']:
                        continue
                    allowed_parts.append(part_number)
        else:
            return jsonify({'error': 'Nur .txt und .csv Dateien sind erlaubt'}), 400
        
        if not allowed_parts:
            return jsonify({'error': 'Keine gültigen Teilenummern in der Datei gefunden'}), 400
        
        # Speichere Customer-Whitelist
        auth_manager.update_customer_whitelist(customer_id, customer_name, allowed_parts, description)
        
        return jsonify({
            'success': True, 
            'message': f'Customer "{customer_name}" mit {len(allowed_parts)} Teilen erstellt'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stock_entries/<part_number>')
@login_required
def api_stock_entries(part_number):
    """API: Liefert alle Systembestand-Einträge für eine Part Number (VOLTAITEM)"""
    pn = part_number.strip().upper()
    entries = [row for row in system_stock_data if row.get('VOLTAITEM', '').strip().upper() == pn]
    # Nur relevante Felder zurückgeben
    result = [
        {
            'Ort': row.get('Ort', ''),
            'IST-Bestand': row.get('IST-Bestand', ''),
            'VOLTAITEM': row.get('VOLTAITEM', '')
        }
        for row in entries
    ]
    return jsonify(result)

@app.route('/api/cloudinary_images/<part_number>')
@login_required
def api_cloudinary_images(part_number):
    """API: Liefert alle Cloudinary-Bilder für eine Part Number"""
    try:
        images = get_cloudinary_images_for_part(part_number)
        return jsonify({
            'success': True,
            'images': images,
            'count': len(images)
        })
    except Exception as e:
        print(f"Error in api_cloudinary_images: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'images': []
        })

# Statische Route für Bilder im geteilten Pfad
@app.route('/shared_images/<path:filename>')
def shared_images(filename):
    """Serviert Bilder aus dem geteilten Pfad"""
    try:
        return send_from_directory(UPLOAD_FOLDER, filename)
    except Exception as e:
        print(f"Fehler beim Servieren des Bildes: {e}")
        return "Bild nicht gefunden", 404

if __name__ == '__main__':
    print("Starte VCV Assets Datenbank...")
    print("Öffne http://localhost:5000 im Browser")
    # Port für Railway/Cloud-Deployment
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
