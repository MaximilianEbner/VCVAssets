# VCV Assets Datenbank - Starter Script

import subprocess
import sys
import os

def install_requirements():
    """Installiert die benötigten Pakete"""
    print("Installiere benötigte Pakete...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✓ Pakete erfolgreich installiert")
    except subprocess.CalledProcessError as e:
        print(f"✗ Fehler beim Installieren der Pakete: {e}")
        return False
    return True

def check_excel_file():
    """Prüft ob die Excel-Datei vorhanden ist"""
    excel_file = "Datenbank_VCV_Assets.xlsx"
    if os.path.exists(excel_file):
        print(f"✓ Excel-Datei gefunden: {excel_file}")
        return True
    else:
        print(f"⚠ Excel-Datei nicht gefunden: {excel_file}")
        print("Die Anwendung erstellt eine leere Datenbank")
        return False

def start_application():
    """Startet die Flask-Anwendung"""
    print("\n" + "="*50)
    print("🚀 VCV Assets Datenbank wird gestartet...")
    print("="*50)
    
    if install_requirements():
        check_excel_file()
        
        print("\n📱 Funktionen der Anwendung:")
        print("  • Teile suchen und filtern")
        print("  • Status ändern (lagernd, verkauft, etc.)")
        print("  • Bilder hinzufügen (auch per Handy)")
        print("  • Analysen und Statistiken")
        print("  • Responsive Design für alle Geräte")
        
        print("\n🌐 Öffne die Anwendung in deinem Browser:")
        print("  Desktop: http://localhost:5000")
        print("  Handy: http://[DEINE-IP]:5000")
        
        print("\n💡 Tipp für Handy-Zugriff:")
        print("  1. Stelle sicher, dass Handy und PC im gleichen WLAN sind")
        print("  2. Finde deine PC-IP mit 'ipconfig' (Windows)")
        print("  3. Öffne http://[DEINE-IP]:5000 auf dem Handy")
        
        print("\nStarte Server... (Strg+C zum Beenden)")
        
        try:
            import app
        except ImportError as e:
            print(f"✗ Fehler beim Starten: {e}")
            print("Stelle sicher, dass alle Dateien vorhanden sind")

if __name__ == "__main__":
    start_application()
