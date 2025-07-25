# Migration Script: Lokale Bilder zu Cloudinary
import os
import json
import cloudinary
import cloudinary.uploader
from pathlib import Path

# Cloudinary konfigurieren mit Ihren Daten
cloudinary.config(
    cloud_name="dwdjbldcg",
    api_key="197529524277377",
    api_secret="csZZwUPt4SE9x0wVrj2MlrHwjVI"
)

def migrate_images():
    print("🚀 Starte Migration zu Cloudinary...")
    
    # Lade aktuelle data.json
    with open('data.json', 'r', encoding='utf-8') as f:
        parts = json.load(f)
    
    images_folder = Path('static/images')
    total_parts = len(parts)
    migrated_count = 0
    error_count = 0
    
    for i, part in enumerate(parts, 1):
        part_number = part.get('Part number', f'part_{i}')
        print(f"\n📦 Teil {i}/{total_parts}: {part_number}")
        
        if 'images' in part and part['images']:
            new_images = []
            
            for img_path in part['images']:
                # Skip bereits vorhandene Cloudinary URLs
                if img_path.startswith('https://res.cloudinary.com/'):
                    new_images.append(img_path)
                    print(f"   ✅ Bereits Cloudinary URL: {img_path}")
                    continue
                
                # Lokalen Pfad erstellen
                if img_path.startswith('images/'):
                    local_path = images_folder / img_path.replace('images/', '')
                elif img_path.startswith('static/images/'):
                    local_path = Path(img_path)
                else:
                    local_path = images_folder / img_path
                
                if local_path.exists():
                    try:
                        print(f"   📤 Uploading: {local_path.name}...")
                        
                        # Upload zu Cloudinary
                        result = cloudinary.uploader.upload(
                            str(local_path),
                            folder=f"vcv-assets/{part_number}",
                            resource_type="image",
                            quality="auto:good",
                            fetch_format="auto"
                        )
                        
                        cloudinary_url = result['secure_url']
                        new_images.append(cloudinary_url)
                        migrated_count += 1
                        
                        print(f"   ✅ Erfolgreich: {cloudinary_url}")
                        
                    except Exception as e:
                        print(f"   ❌ Fehler bei {local_path.name}: {e}")
                        new_images.append(img_path)  # Keep original if upload fails
                        error_count += 1
                else:
                    print(f"   ⚠️  Datei nicht gefunden: {local_path}")
                    new_images.append(img_path)  # Keep original
                    error_count += 1
            
            part['images'] = new_images
    
    # Backup der originalen data.json erstellen
    backup_file = 'data_backup_before_cloudinary.json'
    with open('data.json', 'r', encoding='utf-8') as f:
        backup_data = f.read()
    with open(backup_file, 'w', encoding='utf-8') as f:
        f.write(backup_data)
    print(f"\n💾 Backup erstellt: {backup_file}")
    
    # Speichere aktualisierte data.json
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(parts, f, indent=2, ensure_ascii=False)
    
    print(f"\n🎉 Migration abgeschlossen!")
    print(f"   📊 Insgesamt migriert: {migrated_count} Bilder")
    print(f"   ⚠️  Fehler: {error_count}")
    print(f"   💾 Backup: {backup_file}")
    print(f"   ✅ Neue data.json gespeichert")

if __name__ == "__main__":
    migrate_images()
