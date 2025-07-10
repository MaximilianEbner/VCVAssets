// VCV Assets Datenbank - Frontend JavaScript
let allParts = [];
let currentPart = null;

// Event-Delegation für dynamische Elemente
document.addEventListener('DOMContentLoaded', function() {
    loadAllParts();
    
    // Event-Delegation für Kommentar-Bearbeitung
    document.addEventListener('click', function(e) {
        if (e.target.closest('.comment-preview')) {
            e.stopPropagation();
            const itemId = e.target.closest('.comment-preview').getAttribute('onclick').match(/editComment\('([^']+)'\)/)[1];
            editComment(itemId);
        }
    });
    
    // Event-Delegation für Bild-Löschung
    document.addEventListener('click', function(e) {
        if (e.target.closest('.delete-image-btn')) {
            e.stopPropagation();
            const btn = e.target.closest('.delete-image-btn');
            const onclick = btn.getAttribute('onclick');
            if (onclick) {
                // Extrahiere Parameter aus onclick
                const matches = onclick.match(/deleteImage\('([^']+)',\s*'([^']+)'\)/);
                if (matches) {
                    deleteImage(matches[1], matches[2]);
                }
            }
        }
    });
    
    // Event-Delegation für Kommentar-Buttons
    setupEventDelegation();
});

// Beim Laden der Seite alle Teile laden
// document.addEventListener('DOMContentLoaded', function() {
//     loadAllParts();
// });

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
                            <th>Kommentar</th>
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
        <tr data-item-id="${part.id || Math.random()}" onclick="showPartDetails('${part.id || Math.random()}')" style="cursor: pointer;">
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
            <td>
                <span class="comment-preview" data-item-id="${part.id || Math.random()}" style="cursor: pointer; color: #0d6efd; display: block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${part.comment || 'Klicken zum Hinzufügen'}">
                    ${part.comment ? (part.comment.length > 30 ? part.comment.substring(0, 30) + '...' : part.comment) : '<i class="fas fa-plus-circle me-1"></i>Hinzufügen'}
                </span>
            </td>
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
            <div class="d-flex flex-wrap gap-2">
                ${images.map(img => `
                    <div class="position-relative">
                        <img src="/static/${img}" class="image-preview image-preview-clickable" alt="Teil-Bild" onclick="openLightbox('/static/${img}')">
                        <button class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 delete-image-btn" 
                                 onclick="event.stopPropagation(); deleteImage('${part.id}', '${img}')"
                                 title="Bild löschen"
                                 style="border-radius: 50%; width: 24px; height: 24px; padding: 0; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-times" style="font-size: 10px;"></i>
                        </button>
                    </div>
                `).join('')}
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
            <strong>Kommentar:</strong>
            <div class="d-flex align-items-center">
                <span class="flex-grow-1">${part.comment || 'Kein Kommentar vorhanden'}</span>
                <button class="btn btn-sm btn-outline-primary ms-2" onclick="editComment('${part.id}')">
                    <i class="fas fa-edit me-1"></i>Bearbeiten
                </button>
            </div>
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
    
    // Alle Previews zurücksetzen
    for (let i = 1; i <= 5; i++) {
        document.getElementById(`preview${i}`).style.display = 'none';
        document.getElementById(`imageFile${i}`).value = '';
    }
    
    // Upload-Button deaktivieren
    document.getElementById('uploadBtn').disabled = true;
    
    const modal = new bootstrap.Modal(document.getElementById('uploadModal'));
    modal.show();
}

// Einzelne Bild-Vorschau
function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    const img = preview.querySelector('img');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            img.src = e.target.result;
            img.onclick = () => openLightbox(e.target.result);
            preview.style.display = 'block';
            updateUploadButton();
        };
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.style.display = 'none';
        updateUploadButton();
    }
}

// Upload-Button Status aktualisieren
function updateUploadButton() {
    const uploadBtn = document.getElementById('uploadBtn');
    let selectedCount = 0;
    
    // Zähle ausgewählte Dateien
    for (let i = 1; i <= 5; i++) {
        const input = document.getElementById(`imageFile${i}`);
        if (input.files && input.files[0]) {
            selectedCount++;
        }
    }
    
    if (selectedCount > 0) {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = `<i class="fas fa-upload me-2"></i>${selectedCount} Bild${selectedCount > 1 ? 'er' : ''} hochladen`;
    } else {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-upload me-2"></i>Bilder hochladen';
    }
}

// Einzelne Bilder hochladen
async function uploadIndividualImages() {
    const formData = new FormData();
    const itemId = document.getElementById('uploadItemId').value;
    let selectedFiles = 0;
    
    // Sammle alle ausgewählten Dateien
    for (let i = 1; i <= 5; i++) {
        const input = document.getElementById(`imageFile${i}`);
        if (input.files && input.files[0]) {
            formData.append('images', input.files[0]);
            selectedFiles++;
        }
    }
    
    if (selectedFiles === 0) {
        showError('Bitte wählen Sie mindestens ein Bild aus');
        return;
    }
    
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
            
            // Modal schließen
            const modal = bootstrap.Modal.getInstance(document.getElementById('uploadModal'));
            if (modal) {
                modal.hide();
            }
            
            // Formular zurücksetzen
            document.getElementById('uploadForm').reset();
            for (let i = 1; i <= 5; i++) {
                document.getElementById(`preview${i}`).style.display = 'none';
            }
            
            // Suchterm beibehalten und Tabelle aktualisieren
            const searchQuery = document.getElementById('searchInput').value;
            if (searchQuery) {
                searchParts(); // Suche mit aktuellem Term
            } else {
                loadAllParts(); // Alle Teile laden
            }
            
            // Wenn das Teil-Details Modal offen ist, neu laden
            if (currentPart && currentPart.id == itemId) {
                // Kurz warten, damit die Daten aktualisiert sind
                setTimeout(() => {
                    showPartDetails(itemId);
                }, 100);
            }
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
    showToast(message, 'success');
}

// Fehler-Nachricht anzeigen
function showError(message) {
    showToast(message, 'danger');
}

// Toast-Benachrichtigung anzeigen
function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    const toastId = 'toast-' + Date.now();
    
    const iconMap = {
        'success': 'fas fa-check-circle',
        'danger': 'fas fa-exclamation-triangle',
        'warning': 'fas fa-exclamation-circle',
        'info': 'fas fa-info-circle'
    };
    
    const icon = iconMap[type] || iconMap['info'];
    
    const toastHtml = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header bg-${type} text-white">
                <i class="${icon} me-2"></i>
                <strong class="me-auto">VCV Assets</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: type === 'danger' ? 5000 : 3000
    });
    
    toast.show();
    
    // Toast nach dem Verstecken entfernen
    toastElement.addEventListener('hidden.bs.toast', function() {
        this.remove();
    });
}

// Alert-Funktion als Fallback (deprecated)
function showAlert(message, type) {
    showToast(message, type);
}

// Enter-Taste für Suche
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchParts();
        }
    });
    
    // Event-Delegation für dynamische Elemente
    setupEventDelegation();
});

// Event-Delegation für dynamisch erstellte Elemente
function setupEventDelegation() {
    const searchResults = document.getElementById('searchResults');
    
    // Event-Delegation für Kommentar-Buttons
    searchResults.addEventListener('click', function(e) {
        // Kommentar bearbeiten
        if (e.target.closest('.comment-preview')) {
            e.stopPropagation();
            const commentElement = e.target.closest('.comment-preview');
            const itemId = commentElement.getAttribute('data-item-id');
            if (itemId) {
                editComment(itemId);
            }
        }
        
        // Teil-Details anzeigen (Tabellenzeile)
        if (e.target.closest('tr') && !e.target.closest('button') && !e.target.closest('.comment-preview')) {
            const row = e.target.closest('tr');
            const itemId = row.getAttribute('data-item-id');
            if (itemId) {
                showPartDetails(itemId);
            }
        }
    });
}

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

// Bild löschen (nur für Admins)
async function deleteImage(itemId, imagePath) {
    if (!confirm('Möchten Sie dieses Bild wirklich löschen?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/delete_image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                item_id: itemId,
                image_path: imagePath
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Bild wurde erfolgreich gelöscht');
            
            // Suchterm beibehalten und Tabelle aktualisieren
            const searchQuery = document.getElementById('searchInput').value;
            if (searchQuery) {
                searchParts(); // Suche mit aktuellem Term
            } else {
                loadAllParts(); // Alle Teile laden
            }
            
            // Wenn das Teil-Details Modal offen ist, neu laden
            if (currentPart && currentPart.id == itemId) {
                // Kurz warten, damit die Daten aktualisiert sind
                setTimeout(() => {
                    showPartDetails(itemId);
                }, 100);
            }
        } else {
            showError(result.error || 'Fehler beim Löschen des Bildes');
        }
    } catch (error) {
        console.error('Fehler beim Löschen:', error);
        showError('Fehler beim Löschen des Bildes');
    }
}

// Kommentar bearbeiten
function editComment(itemId) {
    const part = allParts.find(p => p.id == itemId);
    if (!part) {
        showError('Teil nicht gefunden');
        return;
    }
    
    // Modal-Felder füllen
    document.getElementById('commentItemId').value = itemId;
    document.getElementById('commentText').value = part.comment || '';
    
    // Modal anzeigen
    const modal = new bootstrap.Modal(document.getElementById('commentModal'));
    modal.show();
}

// Kommentar speichern
async function saveComment() {
    const itemId = document.getElementById('commentItemId').value;
    const comment = document.getElementById('commentText').value.trim();
    
    if (!itemId) {
        showError('Keine Teil-ID angegeben');
        return;
    }
    
    // Button deaktivieren während des Speicherns
    const saveBtn = document.getElementById('saveCommentBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Speichern...';
    
    try {
        const response = await fetch('/api/update_comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                item_id: itemId,
                comment: comment
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('Kommentar erfolgreich gespeichert, schließe Modal...');
            showSuccess('Kommentar wurde erfolgreich gespeichert');
            
            // Modal explizit schließen - mehrere Methoden verwenden
            const modalElement = document.getElementById('commentModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                console.log('Schließe Modal mit Bootstrap-Instanz...');
                modal.hide();
            } else {
                console.log('Kein Bootstrap-Modal gefunden, verwende Fallback...');
                // Fallback: Modal direkt schließen
                modalElement.classList.remove('show');
                modalElement.style.display = 'none';
                document.body.classList.remove('modal-open');
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
            }
            
            // Formular zurücksetzen
            document.getElementById('commentForm').reset();
            document.getElementById('commentText').value = '';
            
            console.log('Lade Daten neu...');
            // Suchterm beibehalten und Tabelle aktualisieren
            const searchQuery = document.getElementById('searchInput').value;
            if (searchQuery) {
                await searchParts(); // Suche mit aktuellem Term
            } else {
                await loadAllParts(); // Alle Teile laden
            }
            console.log('Daten neu geladen.');
            
            // Wenn das Teil-Details Modal offen ist, neu laden
            if (currentPart && currentPart.id == itemId) {
                console.log('Lade Teil-Details neu...');
                // Kurz warten, damit die Daten aktualisiert sind
                setTimeout(() => {
                    showPartDetails(itemId);
                }, 200);
            }
        } else {
            showError('Fehler beim Speichern: ' + (result.error || 'Unbekannter Fehler'));
        }
    } catch (error) {
        console.error('Fehler beim Speichern des Kommentars:', error);
        showError('Fehler beim Speichern des Kommentars');
    } finally {
        // Button wieder aktivieren
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}
