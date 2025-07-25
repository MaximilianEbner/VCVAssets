# Authentication Module für VCV Assets
import hashlib
import secrets
from functools import wraps
from flask import session, redirect, url_for, request, flash
import json
import os

# Benutzer-Konfiguration
USERS_FILE = 'users.json'
CUSTOMER_WHITELIST_FILE = 'customer_whitelist.json'

class AuthManager:
    def __init__(self):
        self.load_users()
        self.load_customer_whitelist()
    
    def load_users(self):
        """Lädt Benutzer aus JSON oder erstellt Default-User"""
        try:
            if os.path.exists(USERS_FILE):
                with open(USERS_FILE, 'r', encoding='utf-8') as f:
                    self.users = json.load(f)
            else:
                # Default Admin User erstellen
                self.users = {
                    "admin": {
                        "password_hash": self.hash_password("vcv2025"),
                        "role": "admin",
                        "name": "VCV Administrator"
                    },
                    "viewer": {
                        "password_hash": self.hash_password("viewer"),
                        "role": "viewer", 
                        "name": "VCV Viewer"
                    }
                }
                self.save_users()
        except Exception as e:
            print(f"Fehler beim Laden der Benutzer: {e}")
            self.users = {}
    
    def load_customer_whitelist(self):
        """Lädt kundenspezifische Teilelisten"""
        try:
            if os.path.exists(CUSTOMER_WHITELIST_FILE):
                with open(CUSTOMER_WHITELIST_FILE, 'r', encoding='utf-8') as f:
                    self.customer_whitelist = json.load(f)
            else:
                # Standard-Whitelist erstellen
                self.customer_whitelist = {
                    "example_customer": {
                        "name": "Beispiel Kunde",
                        "allowed_parts": ["C1000008-AA", "C1000009-AA", "C1000010-AA"],
                        "description": "Beispiel für kundenspezifische Teileliste"
                    }
                }
                self.save_customer_whitelist()
        except Exception as e:
            print(f"Fehler beim Laden der Kunden-Whitelist: {e}")
            self.customer_whitelist = {}
    
    def save_customer_whitelist(self):
        """Speichert Kunden-Whitelist in JSON"""
        try:
            with open(CUSTOMER_WHITELIST_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.customer_whitelist, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Fehler beim Speichern der Kunden-Whitelist: {e}")
    
    def save_users(self):
        """Speichert Benutzer in JSON"""
        try:
            with open(USERS_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.users, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Fehler beim Speichern der Benutzer: {e}")
    
    def hash_password(self, password):
        """Erstellt sicheren Password Hash"""
        salt = secrets.token_hex(16)
        return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex() + ':' + salt
    
    def verify_password(self, password, hash_with_salt):
        """Überprüft Passwort gegen Hash"""
        try:
            hash_part, salt = hash_with_salt.split(':')
            return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex() == hash_part
        except:
            return False
    
    def authenticate(self, username, password):
        """Authentifiziert Benutzer"""
        if username in self.users:
            if self.verify_password(password, self.users[username]['password_hash']):
                user_data = {
                    'username': username,
                    'role': self.users[username]['role'],
                    'name': self.users[username]['name']
                }
                # Füge customer_id hinzu falls vorhanden
                if 'customer_id' in self.users[username]:
                    user_data['customer_id'] = self.users[username]['customer_id']
                return user_data
        return None
    
    def get_allowed_parts_for_user(self, username):
        """Gibt die erlaubten Teile für einen Benutzer zurück"""
        if username not in self.users:
            return []
        
        user = self.users[username]
        
        # Admin und interne Viewer sehen alle Teile
        if user['role'] in ['admin', 'viewer']:
            return None  # None bedeutet alle Teile
        
        # Customer User sehen nur ihre erlaubten Teile
        if 'customer_id' in user and user['customer_id'] in self.customer_whitelist:
            return self.customer_whitelist[user['customer_id']]['allowed_parts']
        
        return []  # Keine Teile erlaubt
    
    def add_customer_user(self, username, password, customer_id, name):
        """Fügt einen neuen Customer User hinzu"""
        if customer_id not in self.customer_whitelist:
            return False, "Customer ID existiert nicht"
        
        if username in self.users:
            return False, "Benutzername bereits vorhanden"
        
        self.users[username] = {
            'password_hash': self.hash_password(password),
            'role': 'customer',
            'name': name,
            'customer_id': customer_id
        }
        self.save_users()
        return True, "Benutzer erfolgreich erstellt"
    
    def update_customer_whitelist(self, customer_id, name, allowed_parts, description=""):
        """Aktualisiert oder erstellt eine Kunden-Whitelist"""
        self.customer_whitelist[customer_id] = {
            'name': name,
            'allowed_parts': allowed_parts,
            'description': description
        }
        self.save_customer_whitelist()
        return True
    
    def add_user(self, username, password, role="viewer", name=""):
        """Fügt neuen Benutzer hinzu"""
        if username not in self.users:
            self.users[username] = {
                'password_hash': self.hash_password(password),
                'role': role,
                'name': name or username
            }
            self.save_users()
            return True
        return False

# Login Decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session or session['user']['role'] != 'admin':
            flash('Administrator-Rechte erforderlich!', 'error')
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    return decorated_function

def customer_allowed(f):
    """Decorator für Customer-spezifische Zugriffe"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('login'))
        
        # Admin und interne Viewer haben immer Zugriff
        if session['user']['role'] in ['admin', 'viewer']:
            return f(*args, **kwargs)
        
        # Customer User haben nur Zugriff auf ihre Teile
        if session['user']['role'] == 'customer':
            return f(*args, **kwargs)
        
        flash('Zugriff nicht erlaubt!', 'error')
        return redirect(url_for('login'))
    return decorated_function
