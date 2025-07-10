// VCV Assets Datenbank - Frontend JavaScript
let allParts = [];
let currentPart = null;
// Beim Laden der Seite alle Teile laden
document.addEventListener('DOMContentLoaded', function() {
    loadAllParts();
});

// Alle Teile laden
async function loadAllParts() {
    try {
        const response = await fetch('/api/parts');
        allParts = await response.json();
        displayParts(allParts);
        updateResultsCount(allParts.length);
    } catch (error) {
        console.error('Fehler beim Laden der Teile:', error);
        showError('Fehler beim Laden der Daten');
    }
}

// Teile suchen
async function searchParts() {
    const query = document.getElementById('searchInput').value;
    
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        
        // Prüfe ob die Antwort ok ist
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Prüfe den Content-Type
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error('Antwort ist kein JSON:', text);
            throw new Error('Server gab kein JSON zurück');
        }
        
        const results = await response.json();
        displayParts(results);
        updateResultsCount(results.length);
    } catch (error) {
        console.error('Fehler bei der Suche:', error);
        showError('Fehler bei der Suche: ' + error.message);
    }
}

// Teile anzeigen
function displayParts(parts) {
    const container = document.getElementById('searchResults');
    
    if (parts.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> Keine Teile gefunden
                </div>
            </div>
        `;
        return;
    }
    
    // Erstelle Tabelle
    container.innerHTML = `
        <div class="col-12">
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>Aktionen</th>
                            <th>Part Number</th>
                            <th>Beschreibung</th>
                            <th>Kategorie</th>
                            <th>Status</th>
                            <th>Supplier</th>
                            <th>Standort</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${parts.map(part => createPartRow(part)).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Teil-Tabellenzeile erstellen
function createPartRow(part) {
    const status = part.status || 'Unbekannt';
    const statusClass = getStatusClass(status);
    
    return `
        <tr onclick="showPartDetails('${part.id || Math.random()}')" style="cursor: pointer;">
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="event.stopPropagation(); showPartDetails('${part.id || Math.random()}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-outline-secondary" onclick="event.stopPropagation(); showUploadModal('${part.id || Math.random()}')">
                        <i class="fas fa-camera"></i>
                    </button>
                </div>
            </td>
            <td><strong>${part['Part number'] || part.name || part.Bezeichnung || 'Part number'}</strong></td>
            <td>${part['Part Description'] || part.description || part.Beschreibung || 'Part description'}</td>
            <td>${part['Category'] || part.category || part.Kategorie || 'Unbekannt'}</td>
            <td><span class="badge ${statusClass}">${status}</span></td>
            <td>${part['Supplier'] || 'Unbekannt'}</td>
            <td>${part['Location'] || 'Unbekannt'}</td>
        </tr>
    `;
}

// Teil-Karte erstellen (für eventuelle spätere Nutzung beibehalten)
function createPartCard(part) {
    const status = part.status || 'Unbekannt';
    const statusClass = getStatusClass(status);
    const images = part.images || [];
    const firstImage = images.length > 0 ? `/static/${images[0]}` : '/static/placeholder.jpg';
    
    return `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card part-card h-100" onclick="showPartDetails('${part.id || Math.random()}')">
                <div class="card-img-top" style="height: 200px; background: url('${firstImage}') center/cover;">
                    <div class="position-absolute top-0 end-0 m-2">
                        <span class="badge ${statusClass}">${status}</span>
                    </div>
                </div>
                <div class="card-body">
                    <h6 class="card-title">${part['Part number'] || part.name || part.Bezeichnung || 'Part number'}</h6>
                    <p class="card-text small text-muted">
                        ${part['Part Description'] || part.description || part.Beschreibung || 'Part description'}
                    </p>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="fas fa-tag"></i> ${part['Category'] || part.category || part.Kategorie || 'Unbekannt'}
                        </small>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); showUploadModal('${part.id || Math.random()}')">
                                <i class="fas fa-camera"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Status-CSS-Klasse ermitteln
function getStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'lagernd':
            return 'bg-success';
        case 'verkauf gestartet':
            return 'bg-warning';
        case 'verkauft':
            return 'bg-danger';
        case 'teilweise verkauft':
            return 'bg-info';
        default:
            return 'bg-secondary';
    }
}

// Teil-Details anzeigen
function showPartDetails(partId) {
    const part = allParts.find(p => (p.id || Math.random()).toString() === partId.toString());
    if (!part) {
        showError('Teil nicht gefunden');
        return;
    }
    
    currentPart = part;
    
    const modalTitle = document.getElementById('partModalTitle');
    const modalBody = document.getElementById('partModalBody');
    
    modalTitle.textContent = part['Part number'] || part.name || part.Bezeichnung || 'Part number';
    
    const images = part.images || [];
    const imageGallery = images.length > 0 ? 
        `<div class="mb-3">
            <h6>Bilder:</h6>
            <div class="d-flex flex-wrap">
                ${images.map(img => `<img src="/static/${img}" class="image-preview image-preview-clickable" alt="Teil-Bild" onclick="openLightbox('/static/${img}')">`).join('')}
            </div>
        </div>` : '';
    
    modalBody.innerHTML = `
        ${imageGallery}
        <div class="row">
            <div class="col-md-6">
                <strong>Status:</strong>
                <select id="statusSelect" class="form-select mt-1">
                    <option value="lagernd" ${(part.status === 'lagernd') ? 'selected' : ''}>Lagernd</option>
                    <option value="verkauf gestartet" ${(part.status === 'verkauf gestartet') ? 'selected' : ''}>Verkauf gestartet</option>
                    <option value="verkauft" ${(part.status === 'verkauft') ? 'selected' : ''}>Verkauft</option>
                    <option value="teilweise verkauft" ${(part.status === 'teilweise verkauft') ? 'selected' : ''}>Teilweise verkauft</option>
                </select>
            </div>
            <div class="col-md-6">
                <strong>Kategorie:</strong>
                <p>${part['Category'] || part.category || part.Kategorie || 'Unbekannt'}</p>
            </div>
        </div>
        <div class="mt-3">
            <strong>Beschreibung:</strong>
            <p>${part['Part Description'] || part.description || part.Beschreibung || 'Part description'}</p>
        </div>
        <div class="mt-3">
            <strong>Zusätzliche Informationen:</strong>
            <div class="row">
                ${Object.entries(part).filter(([key, value]) => 
                    !['id', 'name', 'Bezeichnung', 'status', 'category', 'Kategorie', 'description', 'Beschreibung', 'images'].includes(key)
                ).map(([key, value]) => 
                    `<div class="col-md-6"><small><strong>${key}:</strong> ${value || 'N/A'}</small></div>`
                ).join('')}
            </div>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('partModal'));
    modal.show();
}

// Status aktualisieren
async function updatePartStatus() {
    if (!currentPart) return;
    
    const newStatus = document.getElementById('statusSelect').value;
    
    try {
        const response = await fetch('/api/update_status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: currentPart.id || Math.random(),
                status: newStatus
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Status erfolgreich aktualisiert');
            // Daten neu laden
            loadAllParts();
            // Modal schließen
            bootstrap.Modal.getInstance(document.getElementById('partModal')).hide();
        } else {
            showError('Fehler beim Aktualisieren des Status');
        }
    } catch (error) {
        console.error('Fehler beim Status-Update:', error);
        showError('Fehler beim Aktualisieren des Status');
    }
}

// Upload-Modal anzeigen
function showUploadModal(partId) {
    document.getElementById('uploadItemId').value = partId;
    
    // Event listener für Datei-Auswahl hinzufügen
    const fileInput = document.getElementById('imageFiles');
    fileInput.addEventListener('change', handleFileSelection);
    
    const modal = new bootstrap.Modal(document.getElementById('uploadModal'));
    modal.show();
}

// Datei-Auswahl verarbeiten
function handleFileSelection(event) {
    const files = event.target.files;
    const uploadBtn = document.getElementById('uploadBtn');
    const previewSection = document.getElementById('imagePreview');
    const previewContainer = document.getElementById('previewContainer');
    
    // Maximale Anzahl Dateien prüfen
    if (files.length > 5) {
        showError('Maximal 5 Bilder erlaubt. Bitte wählen Sie weniger Dateien aus.');
        event.target.value = '';
        uploadBtn.disabled = true;
        previewSection.style.display = 'none';
        return;
    }
    
    if (files.length === 0) {
        uploadBtn.disabled = true;
        previewSection.style.display = 'none';
        return;
    }
    
    // Upload-Button aktivieren
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = `<i class="fas fa-upload me-2"></i>${files.length} Bild${files.length > 1 ? 'er' : ''} hochladen`;
    
    // Vorschau erstellen
    previewContainer.innerHTML = '';
    previewSection.style.display = 'block';
    
    Array.from(files).forEach((file, index) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imgPreview = document.createElement('div');
                imgPreview.className = 'position-relative';
                imgPreview.innerHTML = `
                    <img src="${e.target.result}" class="img-thumbnail image-preview-clickable" 
                         style="width: 80px; height: 80px; object-fit: cover;" 
                         onclick="openLightbox('${e.target.result}')">
                    <small class="d-block text-center text-muted">${file.name}</small>
                `;
                previewContainer.appendChild(imgPreview);
            };
            reader.readAsDataURL(file);
        }
    });
}

// Mehrere Bilder hochladen
async function uploadMultipleImages() {
    const formData = new FormData();
    const fileInput = document.getElementById('imageFiles');
    const itemId = document.getElementById('uploadItemId').value;
    const files = fileInput.files;
    
    if (files.length === 0) {
        showError('Bitte wählen Sie mindestens eine Datei aus');
        return;
    }
    
    if (files.length > 5) {
        showError('Maximal 5 Bilder erlaubt');
        return;
    }
    
    // Alle Dateien zur FormData hinzufügen
    Array.from(files).forEach((file, index) => {
        formData.append('images', file);
    });
    formData.append('item_id', itemId);
    
    // Upload-Button während Upload deaktivieren
    const uploadBtn = document.getElementById('uploadBtn');
    const originalText = uploadBtn.innerHTML;
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Wird hochgeladen...';
    
    try {
        const response = await fetch('/api/upload_multiple_images', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(`${result.uploaded_count} Bild${result.uploaded_count > 1 ? 'er' : ''} erfolgreich hochgeladen`);
            // Daten neu laden
            loadAllParts();
            // Modal schließen
            bootstrap.Modal.getInstance(document.getElementById('uploadModal')).hide();
            // Formular zurücksetzen
            document.getElementById('uploadForm').reset();
            document.getElementById('imagePreview').style.display = 'none';
        } else {
            showError(result.error || 'Fehler beim Hochladen');
        }
    } catch (error) {
        console.error('Fehler beim Upload:', error);
        showError('Fehler beim Hochladen der Bilder');
    } finally {
        // Upload-Button wieder aktivieren
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = originalText;
    }
}

// Analysen anzeigen
async function showAnalytics() {
    try {
        const response = await fetch('/api/analytics');
        const analytics = await response.json();
        
        const analyticsContent = document.getElementById('analyticsContent');
        analyticsContent.innerHTML = `
            <div class="row">
                <div class="col-md-4">
                    <h6><i class="fas fa-boxes"></i> Gesamt</h6>
                    <h3>${analytics.total_items}</h3>
                    <small>Teile in der Datenbank</small>
                </div>
                <div class="col-md-8">
                    <h6><i class="fas fa-chart-pie"></i> Status-Verteilung</h6>
                    ${Object.entries(analytics.status_distribution).map(([status, count]) => 
                        `<div class="d-flex justify-content-between">
                            <span>${status}:</span>
                            <strong>${count}</strong>
                        </div>`
                    ).join('')}
                </div>
            </div>
        `;
        
        // Analytics-Bereich anzeigen
        document.getElementById('analyticsSection').style.display = 'block';
        
        // Smooth scroll to analytics
        document.getElementById('analyticsSection').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Fehler beim Laden der Analysen:', error);
        showError('Fehler beim Laden der Analysen');
    }
}

// Ergebnis-Anzahl aktualisieren
function updateResultsCount(count) {
    const container = document.getElementById('resultsCount');
    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <h5><i class="fas fa-list"></i> ${count} Teile gefunden</h5>
            <button class="btn btn-outline-secondary btn-sm" onclick="document.getElementById('analyticsSection').style.display='none'">
                <i class="fas fa-eye-slash"></i> Analysen ausblenden
            </button>
        </div>
    `;
}

// Erfolgs-Nachricht anzeigen
function showSuccess(message) {
    showAlert(message, 'success');
}

// Fehler-Nachricht anzeigen
function showError(message) {
    showAlert(message, 'danger');
}

// Alert anzeigen
function showAlert(message, type) {
    const alertContainer = document.createElement('div');
    alertContainer.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertContainer.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertContainer.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertContainer);
    
    // Auto-remove nach 5 Sekunden
    setTimeout(() => {
        if (alertContainer.parentNode) {
            alertContainer.remove();
        }
    }, 5000);
}

// Enter-Taste für Suche
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchParts();
        }
    });
});

// Benutzerverwaltung anzeigen
function showUserManagement() {
    window.location.href = '/user_management';
}

// Lightbox Funktionen
let currentImageSrc = '';

function openLightbox(imageSrc) {
    currentImageSrc = imageSrc;
    const lightbox = document.getElementById('lightboxOverlay');
    const lightboxImage = document.getElementById('lightboxImage');
    
    lightboxImage.src = imageSrc;
    lightbox.style.display = 'flex';
    
    // Animation mit kleiner Verzögerung
    setTimeout(() => {
        lightbox.classList.add('show');
    }, 10);
    
    // ESC-Taste zum Schließen
    document.addEventListener('keydown', handleLightboxKeydown);
}

function closeLightbox() {
    const lightbox = document.getElementById('lightboxOverlay');
    lightbox.classList.remove('show');
    
    setTimeout(() => {
        lightbox.style.display = 'none';
        currentImageSrc = '';
    }, 300);
    
    // Event Listener entfernen
    document.removeEventListener('keydown', handleLightboxKeydown);
}

function handleLightboxKeydown(event) {
    if (event.key === 'Escape') {
        closeLightbox();
    }
}

function downloadImage() {
    if (!currentImageSrc) return;
    
    // Erstelle einen temporären Link zum Download
    const link = document.createElement('a');
    link.href = currentImageSrc;
    
    // Extrahiere Dateiname aus URL
    const fileName = currentImageSrc.split('/').pop() || 'image.jpg';
    link.download = fileName;
    
    // Klick simulieren
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess('Bild wird heruntergeladen...');
}

function openImageInNewTab() {
    if (!currentImageSrc) return;
    
    window.open(currentImageSrc, '_blank');
}

// Vorschau-Bilder im Upload-Modal ebenfalls klickbar machen
function updatePreviewWithLightbox() {
    const previewContainer = document.getElementById('previewContainer');
    if (previewContainer) {
        const images = previewContainer.querySelectorAll('img');
        images.forEach(img => {
            img.classList.add('image-preview-clickable');
            img.onclick = () => openLightbox(img.src);
        });
    }
}
