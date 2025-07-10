# Authentication Module für VCV Assets
import hashlib
import secrets
from functools import wraps
from flask import session, redirect, url_for, request, flash
import json
import os

# Benutzer-Konfiguration
USERS_FILE = 'users.json'

class AuthManager:
    def __init__(self):
        self.load_users()
    
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
                return {
                    'username': username,
                    'role': self.users[username]['role'],
                    'name': self.users[username]['name']
                }
        return None
    
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
