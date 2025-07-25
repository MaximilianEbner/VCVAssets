// VCV Assets Datenbank - Frontend JavaScript
let allParts = [];
let currentPart = null;
let currentPage = 1;
let pageSize = 20;
let lastFilteredParts = [];
let userRole = 'customer'; // Standard: Customer

// Helper function to get correct image URL
function getImageUrl(imgPath) {
    // All images should now be Cloudinary URLs
    if (imgPath.startsWith('https://res.cloudinary.com/')) {
        return imgPath;
    }
    
    // If it's not a Cloudinary URL, something is wrong - log it and return as fallback
    console.warn('Non-Cloudinary image path found:', imgPath);
    return imgPath; // Return as-is as fallback
}

// Get user role from the page
function getUserRole() {
    const userBadge = document.querySelector('.navbar .badge');
    if (userBadge) {
        userRole = userBadge.textContent.toLowerCase();
    }
    return userRole;
}

// Event-Delegation für dynamische Elemente
document.addEventListener('DOMContentLoaded', function() {
    // Tabelle neu laden, wenn das Teil-Details-Modal geschlossen wird
    const partModal = document.getElementById('partModal');
    if (partModal) {
        // Füge echten Seiten-Refresh beim Klick auf den Schließen-Button ein
        const closeBtn = partModal.querySelector('.modal-footer .btn.btn-secondary[data-bs-dismiss="modal"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                setTimeout(() => {
                    // Hier ggf. gewünschte Aktionen nach dem Schließen des Modals einfügen
                    // Zum Beispiel: Suche neu laden oder Tabelle aktualisieren
                    searchParts(1);
                }, 200);
            });
        }
    }
});
// Teile anzeigen (mit Pagination)
function displayParts(parts, page = 1) {
    const container = document.getElementById('searchResults');
    const isCustomer = getUserRole() === 'customer';
    
    if (parts.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> Keine Teile gefunden
                </div>
            </div>
        `;
        renderPagination(0, 1);
        return;
    }
    // Pagination: nur die Datensätze für die aktuelle Seite anzeigen
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const pageParts = parts.slice(startIdx, endIdx);
    container.innerHTML = `
        <div class="col-12">
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>Aktionen</th>
                            <th>Part Number</th>
                            <th>Herstellerteilenummer</th>
                            <th>Beschreibung</th>
                            ${!isCustomer ? '<th>Kategorie</th>' : ''}
                            <th>Lagerbestand</th>
                            <th>Supplier</th>
                            <th>Standort</th>
                            ${!isCustomer ? '<th>Kommentar</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${pageParts.map(part => createPartRow(part)).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Pagination-UI rendern
function renderPagination(totalItems, page) {
    const paginationContainerId = 'paginationContainer';
    let container = document.getElementById(paginationContainerId);
    if (!container) {
        // Falls noch nicht vorhanden, unter der Tabelle einfügen
        const searchResults = document.getElementById('searchResults');
        container = document.createElement('div');
        container.id = paginationContainerId;
        container.className = 'd-flex justify-content-center my-3';
        searchResults.parentNode.insertBefore(container, searchResults.nextSibling);
    }
    if (totalItems <= pageSize) {
        container.innerHTML = '';
        return;
    }
    const totalPages = Math.ceil(totalItems / pageSize);
    let html = '<nav><ul class="pagination">';
    html += `<li class="page-item${page === 1 ? ' disabled' : ''}"><a class="page-link" href="#" data-page="${page - 1}">«</a></li>`;
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - page) <= 2) {
            html += `<li class="page-item${i === page ? ' active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        } else if (i === page - 3 || i === page + 3) {
            html += '<li class="page-item disabled"><span class="page-link">…</span></li>';
        }
    }
    html += `<li class="page-item${page === totalPages ? ' disabled' : ''}"><a class="page-link" href="#" data-page="${page + 1}">»</a></li>`;
    html += '</ul></nav>';
    container.innerHTML = html;
    // Event-Listener für Blätterfunktion
    container.querySelectorAll('a.page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const newPage = parseInt(this.getAttribute('data-page'));
            if (!isNaN(newPage) && newPage >= 1 && newPage <= totalPages && newPage !== page) {
                searchParts(newPage);
            }
        });
    });
}

// Beim Laden der Seite alle Teile laden
document.addEventListener('DOMContentLoaded', function() {
    loadAllParts();
});

// Alle Teile laden
async function loadAllParts() {
    try {
        const response = await fetch('/api/parts');
        allParts = await response.json();
                searchParts(1); // immer auf Seite 1 bei neuer Suche
        updateResultsCount(allParts.length);
    } catch (error) {
        console.error('Fehler beim Laden der Teile:', error);
        showError('Fehler beim Laden der Daten');
    }
}


                searchParts(1);
function searchParts(page = 1) {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    let filtered;
    if (!query) {
        filtered = allParts;
    } else {
        filtered = allParts.filter(part => {
            return [
                part['Part number'],
                part.name,
                part.Bezeichnung,
                part.manufacturer_part_number,
                part['Part Description'],
                part.description,
                part.Beschreibung,
                part.Kategorie,
                part.status,
                part['Supplier'],
                part['Location'],
                part.comment
            ].some(val => val && val.toString().toLowerCase().includes(query));
        });
    }
    displayParts(filtered, page);
    updateResultsCount(filtered.length);
    renderPagination(filtered.length, page);
}

// Teile anzeigen
function displayParts(parts, page = 1) {
    const container = document.getElementById('searchResults');
    const isCustomer = getUserRole() === 'customer';
    
    if (parts.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> Keine Teile gefunden
                </div>
            </div>
        `;
        renderPagination(0, 1);
        return;
    }
    // Pagination: nur die Datensätze für die aktuelle Seite anzeigen
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const pageParts = parts.slice(startIdx, endIdx);
    container.innerHTML = `
        <div class="col-12">
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>Aktionen</th>
                            <th>Part Number</th>
                            <th>Herstellerteilenummer</th>
                            <th>Beschreibung</th>
                            ${!isCustomer ? '<th>Kategorie</th>' : ''}
                            <th>Lagerbestand</th>
                            <th>Supplier</th>
                            <th>Standort</th>
                            ${!isCustomer ? '<th>Kommentar</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${pageParts.map(part => createPartRow(part)).join('')}
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
    const partNumber = part['Part number'] || part.name || part.Bezeichnung || 'Part number';
    const isCustomer = getUserRole() === 'customer';
    
    // Lagerbestand aus "Inventory calculated" Feld
    const inventoryCalculated = part['Inventory calculated'] || 0;
    
    // Foto-Anzahl berechnen
    const imageCount = (part.images && Array.isArray(part.images)) ? part.images.length : 0;
    const imageInfo = imageCount > 0 ? `<small class="text-muted ms-1">(${imageCount} Foto${imageCount > 1 ? 's' : ''})</small>` : '';
    
    return `
        <tr data-item-id="${part.id || Math.random()}" style="cursor: pointer;">
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="event.stopPropagation(); showPartDetails('${part.id || Math.random()}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${!isCustomer ? `
                    <button class="btn btn-outline-secondary" onclick="event.stopPropagation(); showUploadModal('${part.id || Math.random()}')">
                        <i class="fas fa-camera"></i>
                    </button>
                    ` : ''}
                </div>
                ${imageInfo}
            </td>
            <td>
                ${isCustomer ? 
                    `<span>${partNumber}</span>` : 
                    `<a href="#" onclick="event.preventDefault(); showStockModal('${partNumber}')" style="text-decoration: underline; color: #0d6efd;">${partNumber}</a>`
                }
            </td>
            <td>
                ${!isCustomer ? `
                <input type="text" class="form-control form-control-sm manufacturer-part-input" value="${part.manufacturer_part_number || ''}" maxlength="50" data-item-id="${part.id}" style="min-width:120px;" title="Herstellerteilenummer direkt bearbeiten" onclick="event.stopPropagation();" />
                ` : `
                <span>${part.manufacturer_part_number || 'N/A'}</span>
                `}
            </td>
            <td>${part['Part Description'] || part.description || part.Beschreibung || 'Part description'}</td>
            ${!isCustomer ? `<td>${part['Category'] || part.category || part.Kategorie || 'Unbekannt'}</td>` : ''}
            <td class="text-end"><span class="badge bg-primary">${inventoryCalculated}</span></td>
            <td>${part['Supplier'] || 'Unbekannt'}</td>
            <td>${part['Location'] || 'Unbekannt'}</td>
            ${!isCustomer ? `
            <td>
                <span class="comment-preview" data-item-id="${part.id || Math.random()}" style="cursor: pointer; color: #0d6efd; display: block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${part.comment || 'Klicken zum Hinzufügen'}">
                    ${part.comment ? (part.comment.length > 30 ? part.comment.substring(0, 30) + '...' : part.comment) : '<i class="fas fa-plus-circle me-1"></i>Hinzufügen'}
                </span>
            </td>
            ` : ''}
        </tr>
    `;
}

// Teil-Karte erstellen (für eventuelle spätere Nutzung beibehalten)
function createPartCard(part) {
    const status = part.status || 'Unbekannt';
    const statusClass = getStatusClass(status);
    const images = part.images || [];
    const firstImage = images.length > 0 ? getImageUrl(images[0]) : '/static/placeholder.jpg';
    
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
    const isCustomer = getUserRole() === 'customer';
    
    const modalTitle = document.getElementById('partModalTitle');
    const modalBody = document.getElementById('partModalBody');
    
    modalTitle.textContent = part['Part number'] || part.name || part.Bezeichnung || 'Part number';
    
    const images = part.images || [];
    
    const imageGallery = images.length > 0 ? 
        `<div class="mb-3">
            <h6>Bilder:</h6>
            <div class="d-flex flex-wrap gap-2">
                ${images.map(img => {
                    const imageUrl = getImageUrl(img);
                    return `
                    <div class="position-relative">
                        <img src="${imageUrl}" class="image-preview image-preview-clickable" alt="Teil-Bild" onclick="openLightbox('${imageUrl}')">
                        ${!isCustomer ? `
                        <button class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 delete-image-btn" 
                                 onclick="event.stopPropagation(); deleteImage('${part.id}', '${img}')"
                                 title="Bild löschen"
                                 style="border-radius: 50%; width: 24px; height: 24px; padding: 0; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-times" style="font-size: 10px;"></i>
                        </button>
                        ` : ''}
                    </div>
                `}).join('')}
            </div>
        </div>` : '';
    
    modalBody.innerHTML = `
        ${imageGallery}
        <div class="row">
            ${!isCustomer ? `
            <div class="col-md-6">
                <strong>Status:</strong>
                <select id="statusSelect" class="form-select mt-1">
                    <option value="lagernd" ${(part.status === 'lagernd') ? 'selected' : ''}>Lagernd</option>
                    <option value="verkauf gestartet" ${(part.status === 'verkauf gestartet') ? 'selected' : ''}>Verkauf gestartet</option>
                    <option value="verkauft" ${(part.status === 'verkauft') ? 'selected' : ''}>Verkauft</option>
                    <option value="teilweise verkauft" ${(part.status === 'teilweise verkauft') ? 'selected' : ''}>Teilweise verkauft</option>
                </select>
            </div>
            ` : `
            <div class="col-md-6">
                <strong>Status:</strong>
                <p>${part.status || 'Unbekannt'}</p>
            </div>
            `}
            ${!isCustomer ? `
            <div class="col-md-6">
                <strong>Kategorie:</strong>
                <p>${part['Category'] || part.category || part.Kategorie || 'Unbekannt'}</p>
            </div>
            ` : ''}
        </div>
        <div class="mt-3">
            <strong>Herstellerteilenummer:</strong>
            ${!isCustomer ? `
            <div class="d-flex align-items-center">
                <input type="text" id="manufacturerPartInput" class="form-control me-2" maxlength="50" style="max-width: 300px;" value="${part.manufacturer_part_number || ''}" placeholder="max. 50 Zeichen">
                <button class="btn btn-sm btn-outline-primary" onclick="saveManufacturerPartNumber('${part.id}')">
                    <i class="fas fa-save me-1"></i>Speichern
                </button>
            </div>
            ` : `
            <p>${part.manufacturer_part_number || 'N/A'}</p>
            `}
        </div>
        <div class="mt-3">
            <strong>Beschreibung:</strong>
            <p>${part['Part Description'] || part.description || part.Beschreibung || 'Part description'}</p>
        </div>
        ${!isCustomer ? `
        <div class="mt-3">
            <strong>Kommentar:</strong>
            <div class="d-flex align-items-center">
                <span class="flex-grow-1">${part.comment || 'Kein Kommentar vorhanden'}</span>
                <button class="btn btn-sm btn-outline-primary ms-2" onclick="editComment('${part.id}')">
                    <i class="fas fa-edit me-1"></i>Bearbeiten
                </button>
            </div>
        </div>
        ` : ''}
        <div class="mt-3">
            <strong>Zusätzliche Informationen:</strong>
            <div class="row">
                ${Object.entries(part).filter(([key, value]) => 
                    !['id', 'name', 'Bezeichnung', 'status', 'category', 'Kategorie', 'description', 'Beschreibung', 'images', 'manufacturer_part_number'].includes(key)
                ).map(([key, value]) => 
                    `<div class="col-md-6"><small><strong>${key}:</strong> ${value || 'N/A'}</small></div>`
                ).join('')}
            </div>
        </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('partModal'));
    modal.show();
}

// Herstellerteilenummer speichern
async function saveManufacturerPartNumber(itemId) {
    const input = document.getElementById('manufacturerPartInput');
    const value = input.value.trim();
    if (value.length > 50) {
        showError('Herstellerteilenummer darf maximal 50 Zeichen lang sein.');
        return;
    }
    try {
        const response = await fetch('/api/update_comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_id: itemId, manufacturer_part_number: value })
        });
        const result = await response.json();
        if (result.success) {
            showSuccess('Herstellerteilenummer gespeichert');
            // Nur Detailansicht neu laden, Tabelle bleibt interaktiv
            showPartDetails(itemId);
        } else {
            showError(result.error || 'Fehler beim Speichern');
        }
    } catch (e) {
        showError('Fehler beim Speichern');
    }

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


// Debounced Suche: Suche wird erst nach 300ms Inaktivität ausgelöst
let searchDebounceTimeout = null;
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            if (searchDebounceTimeout) {
                clearTimeout(searchDebounceTimeout);
            }
            searchDebounceTimeout = setTimeout(() => {
                searchParts();
            }, 300);
        });
        // Suche weiterhin sofort bei Enter-Taste
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                if (searchDebounceTimeout) {
                    clearTimeout(searchDebounceTimeout);
                }
                searchParts();
            }
        });
    }
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
let currentImageIndex = 0;
let currentImageArray = [];

function openLightbox(imageSrc) {
    // Finde das aktuelle Teil und alle seine Bilder
    if (currentPart && currentPart.images) {
        currentImageArray = currentPart.images.map(img => getImageUrl(img));
        currentImageIndex = currentImageArray.findIndex(url => url === imageSrc);
        if (currentImageIndex === -1) currentImageIndex = 0;
    } else {
        currentImageArray = [imageSrc];
        currentImageIndex = 0;
    }
    
    currentImageSrc = imageSrc;
    const lightbox = document.getElementById('lightboxOverlay');
    const lightboxImage = document.getElementById('lightboxImage');
    
    lightboxImage.src = imageSrc;
    lightbox.style.display = 'flex';
    
    // Update navigation buttons
    updateLightboxNavigation();
    
    // Animation mit kleiner Verzögerung
    setTimeout(() => {
        lightbox.classList.add('show');
    }, 10);
    
    // ESC-Taste und Pfeiltasten zum Navigieren
    document.addEventListener('keydown', handleLightboxKeydown);
}

function updateLightboxNavigation() {
    const lightbox = document.getElementById('lightboxOverlay');
    const totalImages = currentImageArray.length;
    
    // Navigation nur anzeigen wenn mehr als 1 Bild vorhanden
    if (totalImages > 1) {
        const navInfo = `${currentImageIndex + 1} / ${totalImages}`;
        
        // Navigation HTML hinzufügen falls nicht vorhanden
        if (!lightbox.querySelector('.lightbox-nav')) {
            const navHtml = `
                <div class="lightbox-nav">
                    <button class="lightbox-btn lightbox-prev" onclick="navigateLightbox(-1)">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <span class="lightbox-counter">${navInfo}</span>
                    <button class="lightbox-btn lightbox-next" onclick="navigateLightbox(1)">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <style>
                    .lightbox-nav {
                        position: absolute;
                        bottom: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        background: rgba(0,0,0,0.7);
                        padding: 10px 20px;
                        border-radius: 25px;
                        z-index: 1001;
                    }
                    .lightbox-btn {
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    }
                    .lightbox-btn:hover:not(:disabled) {
                        background: rgba(255,255,255,0.4);
                        transform: scale(1.1);
                    }
                    .lightbox-btn:disabled {
                        opacity: 0.3;
                        cursor: not-allowed;
                        transform: none;
                    }
                    .lightbox-counter {
                        color: white;
                        font-weight: bold;
                        min-width: 60px;
                        text-align: center;
                        font-size: 14px;
                    }
                    .lightbox-clickable {
                        position: absolute;
                        top: 10%;
                        width: 30%;
                        height: 80%;
                        z-index: 999;
                        cursor: pointer;
                    }
                    .lightbox-click-left {
                        left: 0;
                    }
                    .lightbox-click-right {
                        right: 0;
                    }
                    .lightbox-click-left:hover {
                        background: linear-gradient(to right, rgba(255,255,255,0.1), transparent);
                    }
                    .lightbox-click-right:hover {
                        background: linear-gradient(to left, rgba(255,255,255,0.1), transparent);
                    }
                </style>
                <div class="lightbox-clickable lightbox-click-left" onclick="navigateLightbox(-1)"></div>
                <div class="lightbox-clickable lightbox-click-right" onclick="navigateLightbox(1)"></div>
            `;
            lightbox.insertAdjacentHTML('beforeend', navHtml);
        } else {
            // Update counter
            lightbox.querySelector('.lightbox-counter').textContent = navInfo;
        }
        
        // Enable/disable navigation buttons
        const prevBtn = lightbox.querySelector('.lightbox-prev');
        const nextBtn = lightbox.querySelector('.lightbox-next');
        
        prevBtn.disabled = currentImageIndex === 0;
        nextBtn.disabled = currentImageIndex === totalImages - 1;
        
        lightbox.querySelector('.lightbox-nav').style.display = 'flex';
    } else {
        // Hide navigation if only one image
        const nav = lightbox.querySelector('.lightbox-nav');
        if (nav) nav.style.display = 'none';
    }
}

function navigateLightbox(direction) {
    if (currentImageArray.length <= 1) return;
    
    const newIndex = currentImageIndex + direction;
    
    if (newIndex >= 0 && newIndex < currentImageArray.length) {
        currentImageIndex = newIndex;
        currentImageSrc = currentImageArray[currentImageIndex];
        
        const lightboxImage = document.getElementById('lightboxImage');
        lightboxImage.src = currentImageSrc;
        
        updateLightboxNavigation();
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('lightboxOverlay');
    lightbox.classList.remove('show');
    
    setTimeout(() => {
        lightbox.style.display = 'none';
        currentImageSrc = '';
        currentImageArray = [];
        currentImageIndex = 0;
        
        // Remove navigation elements
        const nav = lightbox.querySelector('.lightbox-nav');
        const clickAreas = lightbox.querySelectorAll('.lightbox-clickable');
        if (nav) nav.remove();
        clickAreas.forEach(area => area.remove());
    }, 300);
    
    // Event Listener entfernen
    document.removeEventListener('keydown', handleLightboxKeydown);
}

function handleLightboxKeydown(event) {
    if (event.key === 'Escape') {
        closeLightbox();
    } else if (event.key === 'ArrowLeft') {
        navigateLightbox(-1);
    } else if (event.key === 'ArrowRight') {
        navigateLightbox(1);
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

// Neues Teil anlegen Modal anzeigen
function showAddPartModal() {
    document.getElementById('addPartForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('addPartModal'));
    modal.show();
}

// Neues Teil anlegen
async function addPart() {
    const form = document.getElementById('addPartForm');
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });
    // Herstellerteilenummer auf max. 50 Zeichen begrenzen (Frontend-Schutz)
    if (data.manufacturer_part_number && data.manufacturer_part_number.length > 50) {
        showError('Herstellerteilenummer darf maximal 50 Zeichen lang sein.');
        return;
    }
    // Button deaktivieren
    const btn = document.querySelector('#addPartModal .btn-primary');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Speichern...';
    try {
        const response = await fetch('/api/add_part', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
            showSuccess('Teil erfolgreich angelegt!');
            // Modal schließen
            const modal = bootstrap.Modal.getInstance(document.getElementById('addPartModal'));
            if (modal) modal.hide();
            // Tabelle neu laden
            await loadAllParts();
        } else {
            showError(result.error || 'Fehler beim Anlegen des Teils');
        }
    } catch (e) {
        showError('Fehler beim Anlegen des Teils');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save me-2"></i>Speichern';
    }
}

// Systembestand-Modal anzeigen
async function showStockModal(partNumber) {
    document.getElementById('stockModalPartNumber').textContent = partNumber;
    const container = document.getElementById('stockModalTableContainer');
    container.innerHTML = '<div class="text-center"><div class="spinner-border"></div> Lädt...</div>';
    const modalElement = document.getElementById('stockModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    // Fix: Remove leftover modal-backdrop when modal is hidden
    modalElement.addEventListener('hidden.bs.modal', function cleanupBackdrop() {
        document.body.classList.remove('modal-open');
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(bd => bd.parentNode && bd.parentNode.removeChild(bd));
        // Remove this event listener after running once
        modalElement.removeEventListener('hidden.bs.modal', cleanupBackdrop);
    });
    try {
        const response = await fetch(`/api/stock_entries/${encodeURIComponent(partNumber)}`);
        const data = await response.json();
        if (data.length === 0) {
            container.innerHTML = '<div class="alert alert-info">Kein Systembestand für diese Part Number gefunden.</div>';
            return;
        }
        let table = `<div class="table-responsive"><table class="table table-bordered table-striped"><thead><tr><th>Ort</th><th>IST-Bestand</th></tr></thead><tbody>`;
        data.forEach(row => {
            table += `<tr><td>${row['Ort'] || ''}</td><td>${row['IST-Bestand'] || ''}</td></tr>`;
        });
        table += '</tbody></table></div>';
        container.innerHTML = table;
    } catch (e) {
        container.innerHTML = '<div class="alert alert-danger">Fehler beim Laden des Systembestands.</div>';
    }
}
