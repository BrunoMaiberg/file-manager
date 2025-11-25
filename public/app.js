// API Base URL - automatically detect the current server port
const API_URL = `${window.location.protocol}//${window.location.hostname}:${window.location.port}/api`;

// State
let currentPath = '';
let selectedItem = null;
let clipboardItem = null;
let clipboardAction = null; // 'copy' or 'move'
let sortBy = 'name'; // name, date, size, type
let sortDirection = 'asc'; // asc, desc

// DOM Elements
const fileGrid = document.getElementById('fileGrid');
const emptyState = document.getElementById('emptyState');
const breadcrumb = document.getElementById('breadcrumb');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const sortDirectionBtn = document.getElementById('sortDirectionBtn');
const uploadBtn = document.getElementById('uploadBtn');
const newFolderBtn = document.getElementById('newFolderBtn');
const fileInput = document.getElementById('fileInput');
const contextMenu = document.getElementById('contextMenu');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalFooter = document.getElementById('modalFooter');
const modalClose = document.getElementById('modalClose');
const dropZone = document.getElementById('dropZone');
const toastContainer = document.getElementById('toastContainer');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsClose = document.getElementById('settingsClose');
const logoInput = document.getElementById('logoInput');
const logoPreview = document.getElementById('logoPreview');
const uploadLogoBtn = document.getElementById('uploadLogoBtn');
const removeLogoBtn = document.getElementById('removeLogoBtn');
const uploadProgressContainer = document.getElementById('uploadProgressContainer');
const uploadFileName = document.getElementById('uploadFileName');
const uploadProgressFill = document.getElementById('uploadProgressFill');
const uploadProgressText = document.getElementById('uploadProgressText');
const uploadSpeed = document.getElementById('uploadSpeed');
const cancelUploadBtn = document.getElementById('cancelUploadBtn');
const imagePreviewModal = document.getElementById('imagePreviewModal');
const imagePreviewClose = document.getElementById('imagePreviewClose');
const previewImage = document.getElementById('previewImage');
const imagePrevBtn = document.getElementById('imagePrevBtn');
const imageNextBtn = document.getElementById('imageNextBtn');
const imagePreviewName = document.getElementById('imagePreviewName');
const imageDownloadBtn = document.getElementById('imageDownloadBtn');
const videoPlayerModal = document.getElementById('videoPlayerModal');
const videoPlayerClose = document.getElementById('videoPlayerClose');
const videoPlayer = document.getElementById('videoPlayer');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadFiles();
  setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
  // Upload button
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileSelect);
  
  // New folder button
  newFolderBtn.addEventListener('click', showNewFolderModal);
  
  // Search
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (e.target.value.trim()) {
        searchFiles(e.target.value);
      } else {
        loadFiles();
      }
    }, 300);
  });
  
  // Modal close
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  // Context menu
  document.addEventListener('click', () => hideContextMenu());
  contextMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action) handleContextAction(action);
  });
  
  // Drag and drop
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.remove('hidden');
  });
  
  document.addEventListener('dragleave', (e) => {
    if (e.target === dropZone) {
      dropZone.classList.add('hidden');
    }
  });
  
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.add('hidden');
    handleFileDrop(e.dataTransfer.files);
  });
  
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.add('hidden');
    handleFileDrop(e.dataTransfer.files);
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeSettingsModal();
      hideContextMenu();
    }
  });
  
  // Settings
  settingsBtn.addEventListener('click', showSettingsModal);
  settingsClose.addEventListener('click', closeSettingsModal);
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
  });
  
  // Theme selection
  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      const theme = card.dataset.theme;
      setTheme(theme);
    });
  });
  
  // Sort controls
  sortSelect.addEventListener('change', (e) => {
    sortBy = e.target.value;
    localStorage.setItem('fileManagerSortBy', sortBy);
    loadFiles();
  });
  
  sortDirectionBtn.addEventListener('click', () => {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    sortDirectionBtn.classList.toggle('desc', sortDirection === 'desc');
    localStorage.setItem('fileManagerSortDirection', sortDirection);
    loadFiles();
  });
  
  // Logo upload
  uploadLogoBtn.addEventListener('click', () => logoInput.click());
  logoInput.addEventListener('change', handleLogoUpload);
  removeLogoBtn.addEventListener('click', removeLogo);
}

// Load Files
async function loadFiles(path = currentPath) {
  try {
    const response = await fetch(`${API_URL}/files?path=${encodeURIComponent(path)}`);
    const data = await response.json();
    
    currentPath = data.currentPath;
    updateBreadcrumb();
    renderFiles(data.files);
  } catch (error) {
    showToast('Erro ao carregar arquivos', 'error');
    console.error('Error loading files:', error);
  }
}

// Sort Files
function sortFiles(files) {
  return files.sort((a, b) => {
    // Always keep folders first
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'date':
        comparison = new Date(a.modified) - new Date(b.modified);
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'type':
        const extA = a.extension || '';
        const extB = b.extension || '';
        comparison = extA.localeCompare(extB);
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });
}

// Render Files
function renderFiles(files) {
  fileGrid.innerHTML = '';
  
  // Sort files before rendering
  const sortedFiles = sortFiles(files);
  
  if (sortedFiles.length === 0) {
    emptyState.classList.remove('hidden');
    fileGrid.classList.add('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  fileGrid.classList.remove('hidden');
  
  sortedFiles.forEach(file => {
    const fileItem = createFileItem(file, sortedFiles);
    fileGrid.appendChild(fileItem);
  });
}

// Create File Item
function createFileItem(file, allFiles = []) {
  const item = document.createElement('div');
  item.className = 'file-item';
  
  // Check if file is an image or video
  const isImage = file.type === 'file' && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(file.extension?.toLowerCase());
  const isVideo = file.type === 'file' && ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv'].includes(file.extension?.toLowerCase());
  
  let iconHTML;
  if (isImage || isVideo) {
    // Use thumbnail for images and videos
    const thumbnailUrl = `${API_URL}/thumbnail?path=${encodeURIComponent(file.path)}`;
    iconHTML = `<img src="${thumbnailUrl}" alt="${file.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div style="display:none;">${getFileIcon(file)}</div>`;
  } else {
    // Use icon for other files
    iconHTML = getFileIcon(file);
  }
  
  item.innerHTML = `
    <div class="file-icon ${file.type === 'folder' ? 'folder' : ''}">
      ${iconHTML}
    </div>
    <div class="file-info">
      <div class="file-name">${file.name}</div>
      <div class="file-meta">${file.type === 'folder' ? 'Pasta' : formatFileSize(file.size)}</div>
    </div>
  `;
  
  // Single click to open folders, preview images, or play videos
  item.addEventListener('click', () => {
    if (file.type === 'folder') {
      loadFiles(file.path);
    } else if (isImage) {
      // Open image preview
      openImagePreview(file, allFiles);
    } else if (isVideo) {
      // Open video player
      openVideoPlayer(file);
    } else {
      // Highlight selected item for other files
      document.querySelectorAll('.file-item').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      selectedItem = file;
    }
  });
  
  // Double click to download files
  item.addEventListener('dblclick', () => {
    if (file.type === 'file') {
      downloadFile(file.path);
    }
  });
  
  // Right click for context menu
  item.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    selectedItem = file;
    showContextMenu(e.clientX, e.clientY);
    
    // Highlight selected item
    document.querySelectorAll('.file-item').forEach(el => el.classList.remove('selected'));
    item.classList.add('selected');
  });
  
  return item;
}

// Get File Icon
function getFileIcon(file) {
  if (file.type === 'folder') {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
    </svg>`;
  }
  
  const ext = file.extension?.toLowerCase();
  
  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>`;
  }
  
  // Video files
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(ext)) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>`;
  }
  
  // Audio files
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>`;
  }
  
  // Document files
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>`;
  }
  
  // Archive files
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="21 8 21 21 3 21 3 8"/>
      <rect x="1" y="3" width="22" height="5"/>
      <line x1="10" y1="12" x2="14" y2="12"/>
    </svg>`;
  }
  
  // Default file icon
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
    <polyline points="13 2 13 9 20 9"/>
  </svg>`;
}

// Update Breadcrumb
function updateBreadcrumb() {
  breadcrumb.innerHTML = `
    <button class="breadcrumb-item" data-path="">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m3 9 9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      </svg>
      Início
    </button>
  `;
  
  if (currentPath) {
    const parts = currentPath.split(/[/\\]/).filter(p => p);
    let accumulatedPath = '';
    
    parts.forEach(part => {
      accumulatedPath += (accumulatedPath ? '/' : '') + part;
      const btn = document.createElement('button');
      btn.className = 'breadcrumb-item';
      btn.dataset.path = accumulatedPath;
      btn.textContent = part;
      breadcrumb.appendChild(btn);
    });
  }
  
  // Add click handlers
  breadcrumb.querySelectorAll('.breadcrumb-item').forEach(btn => {
    btn.addEventListener('click', () => loadFiles(btn.dataset.path));
  });
}

// File Upload
function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  uploadFiles(files);
  fileInput.value = '';
}

function handleFileDrop(files) {
  uploadFiles(Array.from(files));
}

async function uploadFiles(files) {
  if (files.length === 0) return;
  
  console.log('Uploading to path:', currentPath);
  
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  formData.append('path', currentPath);
  
  // Calculate total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const fileNames = files.map(f => f.name).join(', ');
  
  // Show progress container
  uploadProgressContainer.classList.remove('hidden');
  uploadFileName.textContent = files.length === 1 ? files[0].name : `${files.length} arquivos`;
  uploadProgressFill.style.width = '0%';
  uploadProgressText.textContent = '0%';
  uploadSpeed.textContent = '';
  
  // Create XMLHttpRequest
  const xhr = new XMLHttpRequest();
  let startTime = Date.now();
  let uploadedBytes = 0;
  
  // Progress tracking
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const percentComplete = (e.loaded / e.total) * 100;
      uploadProgressFill.style.width = percentComplete + '%';
      uploadProgressText.textContent = Math.round(percentComplete) + '%';
      
      // Calculate speed
      const elapsedTime = (Date.now() - startTime) / 1000; // seconds
      const speed = e.loaded / elapsedTime; // bytes per second
      const speedMB = (speed / (1024 * 1024)).toFixed(2);
      uploadSpeed.textContent = `${speedMB} MB/s`;
    }
  });
  
  // Upload complete
  xhr.addEventListener('load', () => {
    if (xhr.status === 200) {
      const data = JSON.parse(xhr.responseText);
      if (data.success) {
        uploadProgressFill.style.width = '100%';
        uploadProgressText.textContent = '100%';
        showToast(`${files.length} arquivo(s) enviado(s) com sucesso`, 'success');
        setTimeout(() => {
          uploadProgressContainer.classList.add('hidden');
          loadFiles();
        }, 1000);
      } else {
        showToast('Erro ao enviar arquivos', 'error');
        uploadProgressContainer.classList.add('hidden');
      }
    } else {
      showToast('Erro ao enviar arquivos', 'error');
      uploadProgressContainer.classList.add('hidden');
    }
  });
  
  // Upload error
  xhr.addEventListener('error', () => {
    showToast('Erro ao enviar arquivos', 'error');
    uploadProgressContainer.classList.add('hidden');
  });
  
  // Upload aborted
  xhr.addEventListener('abort', () => {
    showToast('Upload cancelado', 'info');
    uploadProgressContainer.classList.add('hidden');
  });
  
  // Cancel button
  cancelUploadBtn.onclick = () => {
    xhr.abort();
  };
  
  // Send request
  xhr.open('POST', `${API_URL}/upload`);
  xhr.send(formData);
}

// Download File
function downloadFile(filePath) {
  // Use iframe approach - this respects browser download settings better
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = `${API_URL}/download?path=${encodeURIComponent(filePath)}`;
  
  document.body.appendChild(iframe);
  
  // Remove iframe after download starts
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 1000);
  
  const filename = filePath.split(/[/\\]/).pop();
  showToast('Baixando: ' + filename, 'info');
}

// New Folder
function showNewFolderModal() {
  modalTitle.textContent = 'Nova Pasta';
  modalBody.innerHTML = `
    <div class="form-group">
      <label class="form-label">Nome da pasta</label>
      <input type="text" id="folderNameInput" class="form-input" placeholder="Digite o nome da pasta" autofocus>
    </div>
  `;
  modalFooter.innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="createFolder()">Criar</button>
  `;
  
  modal.classList.remove('hidden');
  
  // Enter to submit
  document.getElementById('folderNameInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createFolder();
  });
}

async function createFolder() {
  const nameInput = document.getElementById('folderNameInput');
  const name = nameInput.value.trim();
  
  if (!name) {
    showToast('Digite um nome para a pasta', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentPath, name })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Pasta criada com sucesso', 'success');
      closeModal();
      loadFiles();
    } else {
      showToast(data.error || 'Erro ao criar pasta', 'error');
    }
  } catch (error) {
    showToast('Erro ao criar pasta', 'error');
    console.error('Error creating folder:', error);
  }
}

// Context Menu
function showContextMenu(x, y) {
  hideContextMenu();
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.classList.remove('hidden');
  
  // Adjust position if off screen
  setTimeout(() => {
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      contextMenu.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      contextMenu.style.top = `${y - rect.height}px`;
    }
  }, 0);
}

function hideContextMenu() {
  contextMenu.classList.add('hidden');
}

function handleContextAction(action) {
  hideContextMenu();
  
  if (!selectedItem) return;
  
  switch (action) {
    case 'download':
      downloadFile(selectedItem.path);
      break;
    case 'rename':
      showRenameModal();
      break;
    case 'copy':
      clipboardItem = selectedItem;
      clipboardAction = 'copy';
      showToast('Item copiado. Navegue até o destino e cole.', 'info');
      break;
    case 'move':
      clipboardItem = selectedItem;
      clipboardAction = 'move';
      showToast('Item cortado. Navegue até o destino e cole.', 'info');
      break;
    case 'delete':
      showDeleteConfirmation();
      break;
  }
}

// Rename
function showRenameModal() {
  modalTitle.textContent = 'Renomear';
  modalBody.innerHTML = `
    <div class="form-group">
      <label class="form-label">Novo nome</label>
      <input type="text" id="renameInput" class="form-input" value="${selectedItem.name}" autofocus>
    </div>
  `;
  modalFooter.innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="renameItem()">Renomear</button>
  `;
  
  modal.classList.remove('hidden');
  
  const input = document.getElementById('renameInput');
  input.select();
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') renameItem();
  });
}

async function renameItem() {
  const newName = document.getElementById('renameInput').value.trim();
  
  if (!newName) {
    showToast('Digite um nome válido', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/rename`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: selectedItem.path, newName })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Renomeado com sucesso', 'success');
      closeModal();
      loadFiles();
    } else {
      showToast(data.error || 'Erro ao renomear', 'error');
    }
  } catch (error) {
    showToast('Erro ao renomear', 'error');
    console.error('Error renaming:', error);
  }
}

// Delete
function showDeleteConfirmation() {
  modalTitle.textContent = 'Confirmar Exclusão';
  modalBody.innerHTML = `
    <p>Tem certeza que deseja excluir <strong>${selectedItem.name}</strong>?</p>
    <p style="color: var(--text-tertiary); font-size: 0.875rem; margin-top: 0.5rem;">Esta ação não pode ser desfeita.</p>
  `;
  modalFooter.innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" style="background: var(--danger);" onclick="deleteItem()">Excluir</button>
  `;
  
  modal.classList.remove('hidden');
}

async function deleteItem() {
  try {
    const response = await fetch(`${API_URL}/delete?path=${encodeURIComponent(selectedItem.path)}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Excluído com sucesso', 'success');
      closeModal();
      loadFiles();
    } else {
      showToast(data.error || 'Erro ao excluir', 'error');
    }
  } catch (error) {
    showToast('Erro ao excluir', 'error');
    console.error('Error deleting:', error);
  }
}

// Search
async function searchFiles(query) {
  try {
    const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}&path=${encodeURIComponent(currentPath)}`);
    const data = await response.json();
    
    renderFiles(data.results);
  } catch (error) {
    showToast('Erro ao buscar arquivos', 'error');
    console.error('Error searching:', error);
  }
}

// Modal
function closeModal() {
  modal.classList.add('hidden');
}

// Toast Notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  
  toast.innerHTML = `
    ${icons[type]}
    <div class="toast-message">${message}</div>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.25s reverse';
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

// Format File Size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Settings Functions
function loadSettings() {
  // Load theme
  const savedTheme = localStorage.getItem('fileManagerTheme') || 'gray-minimal';
  setTheme(savedTheme, false);
  
  // Load sort preferences
  sortBy = localStorage.getItem('fileManagerSortBy') || 'name';
  sortDirection = localStorage.getItem('fileManagerSortDirection') || 'asc';
  sortSelect.value = sortBy;
  sortDirectionBtn.classList.toggle('desc', sortDirection === 'desc');
  
  // Load logo
  const savedLogo = localStorage.getItem('fileManagerLogo');
  if (savedLogo) {
    updateLogoDisplay(savedLogo);
  }
}

function showSettingsModal() {
  settingsModal.classList.remove('hidden');
}

function closeSettingsModal() {
  settingsModal.classList.add('hidden');
}

function setTheme(theme, save = true) {
  // Update body data attribute
  document.body.dataset.theme = theme;
  
  // Update active theme card
  document.querySelectorAll('.theme-card').forEach(card => {
    card.classList.toggle('active', card.dataset.theme === theme);
  });
  
  // Save to localStorage
  if (save) {
    localStorage.setItem('fileManagerTheme', theme);
    showToast('Tema alterado com sucesso', 'success');
  }
}

function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    showToast('Por favor, selecione uma imagem válida', 'error');
    return;
  }
  
  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    showToast('A imagem deve ter no máximo 2MB', 'error');
    return;
  }
  
  // Read and save logo
  const reader = new FileReader();
  reader.onload = (event) => {
    const logoData = event.target.result;
    localStorage.setItem('fileManagerLogo', logoData);
    updateLogoDisplay(logoData);
    showToast('Logo atualizada com sucesso', 'success');
  };
  reader.readAsDataURL(file);
  
  // Clear input
  logoInput.value = '';
}

function removeLogo() {
  localStorage.removeItem('fileManagerLogo');
  updateLogoDisplay(null);
  showToast('Logo removida com sucesso', 'success');
}

function updateLogoDisplay(logoData) {
  const logoIcon = document.querySelector('.logo-icon');
  const logoElement = document.querySelector('.logo');
  
  if (logoData) {
    // Update preview in settings
    logoPreview.innerHTML = `<img src="${logoData}" alt="Logo">`;
    
    // Update header logo
    if (logoIcon) {
      logoIcon.outerHTML = `<img src="${logoData}" alt="Logo" class="logo-icon">`;
    }
  } else {
    // Reset to default
    logoPreview.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
      </svg>
    `;
    
    // Reset header logo
    const logoImg = logoElement.querySelector('img');
    if (logoImg) {
      logoImg.outerHTML = `
        <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
        </svg>
      `;
    }
  }
}

// Image Preview Functions
let currentImages = [];
let currentImageIndex = 0;

function openImagePreview(file, allFiles) {
  // Filter only image files
  currentImages = allFiles.filter(f => {
    const ext = f.extension?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
  });
  
  currentImageIndex = currentImages.findIndex(img => img.path === file.path);
  
  if (currentImageIndex === -1) return;
  
  showImagePreview(currentImages[currentImageIndex]);
  imagePreviewModal.classList.remove('hidden');
}

function showImagePreview(file) {
  const imageUrl = `${API_URL}/download?path=${encodeURIComponent(file.path)}`;
  previewImage.src = imageUrl;
  imagePreviewName.textContent = file.name;
  
  // Update navigation buttons visibility
  imagePrevBtn.style.display = currentImageIndex > 0 ? 'flex' : 'none';
  imageNextBtn.style.display = currentImageIndex < currentImages.length - 1 ? 'flex' : 'none';
}

function navigateImage(direction) {
  const newIndex = currentImageIndex + direction;
  if (newIndex >= 0 && newIndex < currentImages.length) {
    currentImageIndex = newIndex;
    showImagePreview(currentImages[currentImageIndex]);
  }
}

function closeImagePreview() {
  imagePreviewModal.classList.add('hidden');
  previewImage.src = '';
}

// Event listeners for image preview
imagePreviewClose.addEventListener('click', closeImagePreview);
imagePrevBtn.addEventListener('click', () => navigateImage(-1));
imageNextBtn.addEventListener('click', () => navigateImage(1));

imageDownloadBtn.addEventListener('click', () => {
  if (currentImages[currentImageIndex]) {
    downloadFile(currentImages[currentImageIndex].path);
  }
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (!imagePreviewModal.classList.contains('hidden')) {
    if (e.key === 'Escape') closeImagePreview();
    if (e.key === 'ArrowLeft') navigateImage(-1);
    if (e.key === 'ArrowRight') navigateImage(1);
  }
  
  // Video player keyboard shortcuts
  if (!videoPlayerModal.classList.contains('hidden')) {
    if (e.key === 'Escape') closeVideoPlayer();
  }
});

// Close on background click
imagePreviewModal.addEventListener('click', (e) => {
  if (e.target === imagePreviewModal) {
    closeImagePreview();
  }
});

// Video Player Functions
function openVideoPlayer(file) {
  const videoUrl = `${API_URL}/stream?path=${encodeURIComponent(file.path)}`;
  videoPlayer.src = videoUrl;
  videoPlayerModal.classList.remove('hidden');
  videoPlayer.play();
}

function closeVideoPlayer() {
  videoPlayerModal.classList.add('hidden');
  videoPlayer.pause();
  videoPlayer.src = '';
}

// Event listeners for video player
videoPlayerClose.addEventListener('click', closeVideoPlayer);

// Close on background click only (not on video)
videoPlayerModal.addEventListener('click', (e) => {
  if (e.target === videoPlayerModal || e.target.classList.contains('video-player-content')) {
    closeVideoPlayer();
  }
});

// Make functions globally accessible for inline event handlers
window.closeModal = closeModal;
window.createFolder = createFolder;
window.renameItem = renameItem;
window.deleteItem = deleteItem;
window.openImagePreview = openImagePreview;
window.openVideoPlayer = openVideoPlayer;
