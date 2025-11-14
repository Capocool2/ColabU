import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://sapmwupwlwjrpnrkklaz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhcG13dXB3bHdqcnBucmtrbGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MjMzNzMsImV4cCI6MjA3NTA5OTM3M30.puy88odroAEvikkyozavFGWRWybPLzpUIl6ZDhutkRM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', function() {
    if (!localStorage.getItem('currentUser')) {
        alert('Por favor inicia sesión primero');
        window.location.href = 'login.html';
        return;
    }
    initializeGroups();
});

function initializeGroups() {
    loadUserGroups();
    console.log('Grupos listo!');
}

async function getGroups() {
    const { data, error } = await supabase
        .from('grupos')
        .select('*');
    if (error) {
        console.error('Error al obtener grupos:', error);
        return [];
    }
    return data || [];
}

async function getUsers() {
    const { data, error } = await supabase
        .from('usuarios')
        .select('*');
    if (error) {
        console.error('Error al obtener usuarios:', error);
        return [];
    }
    return data || [];
}

async function loadUserGroups() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    const allGroups = await getGroups();
    const userGroups = allGroups.filter(group =>
        (group.miembros || []).some(member => member.user_id === currentUser.id)
    );

    console.log('Grupos del usuario:', userGroups);
    displayGroups(userGroups);
}

function displayGroups(groups) {
    const contentGrid = document.querySelector('.content-grid');
    if (!contentGrid) {
        console.error('No se encontró el contenedor de grupos');
        return;
    }

    contentGrid.innerHTML = '';
    // Mostrar botón para crear grupo SIEMPRE
    const createGroupCard = createCreateGroupCard();
    contentGrid.appendChild(createGroupCard);

    if (groups.length === 0) {
        contentGrid.innerHTML += `
            <div class="no-groups">
                <h3>No tienes grupos aún</h3>
                <p>Crea tu primer grupo para empezar a colaborar</p>
            </div>
        `;
        return;
    }

    groups.forEach(group => {
        const groupElement = createGroupElement(group);
        contentGrid.appendChild(groupElement);
    });
}

function createGroupElement(group) {
    const miembros = (group.miembros || []).map(m => `<span class="member-avatar-small">${getInitials(m.name)}</span>`).join('');
    return Object.assign(document.createElement('div'), {
        className: 'group-card',
        innerHTML: `
            <h3>${group.nombre}</h3>
            <p><b>Proyecto:</b> ${group.nombre_del_proyecto}</p>
            <p><b>Descripción:</b> <span style="color:#555">${group.descripcion || ''}</span></p>
            <p><b>Fecha límite:</b> <span style="color:#555">${formatDate(group.fecha_limite) || ''}</span></p>
            <div class="members-preview">${miembros}</div>
            <button class="btn btn-secondary" onclick="showGroupDetails(${group.identificación})">Ver detalles</button>
        `
    });
}

function createCreateGroupCard() {
    const div = document.createElement('div');
    div.className = 'group-card create-group-card';
    div.innerHTML = `
        <button class="btn btn-primary" onclick="showCreateGroupModal()">+ Crear Nuevo Grupo</button>
    `;
    return div;
}

window.showCreateGroupModal = showCreateGroupModal; // Para que funcione el onclick

async function showCreateGroupModal() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    const users = await getUsers();
    const availableUsers = users.filter(user => user.identificacion !== currentUser.id);

    const modalHTML = `
        <div class="group-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Crear Nuevo Grupo</h3>
                    <button class="close-modal" onclick="closeGroupModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="createGroupForm">
                        <div class="form-group">
                            <label for="groupName">Nombre del Grupo *</label>
                            <input type="text" id="groupName" required placeholder="Ej: Equipo Desarrollo Web">
                        </div>
                        <div class="form-group">
                            <label for="projectName">Nombre del Proyecto *</label>
                            <input type="text" id="projectName" required placeholder="Ej: Sistema de Gestion Academica">
                        </div>
                        <div class="form-group">
                            <label for="groupDescription">Descripcion del Proyecto</label>
                            <textarea id="groupDescription" rows="3" placeholder="Describe los objetivos, alcance y caracteristicas principales del proyecto..."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="groupDeadline">Fecha de Entrega Objetivo</label>
                            <input type="date" id="groupDeadline">
                        </div>
                        <div class="form-group">
                            <label>Agregar Miembros al Equipo</label>
                            <div class="members-selection-container">
                                <div class="selection-info">
                                    <small>Selecciona los miembros y asigna sus roles en el proyecto</small>
                                </div>
                                <div class="members-selection">
                                    ${availableUsers.map(user => `
                                        <div class="user-selection-item">
                                            <div class="user-selection-header">
                                                <label class="user-checkbox">
                                                    <input type="checkbox" name="members" value="${user.identificacion}">
                                                    <span class="checkmark"></span>
                                                    <div class="user-info">
                                                        <span class="user-name">${user.nombre}</span>
                                                        <span class="user-type">${user.role === 'teacher' ? 'Docente' : 'Estudiante'}</span>
                                                    </div>
                                                </label>
                                            </div>
                                            <div class="role-selection">
                                                <label>Rol en el proyecto:</label>
                                                <select class="member-role-select" data-user-id="${user.identificacion}">
                                                    <option value="">Seleccionar rol...</option>
                                                    <option value="Lider de proyecto">Lider de proyecto</option>
                                                    <option value="Desarrollador Frontend">Desarrollador Frontend</option>
                                                    <option value="Desarrollador Backend">Desarrollador Backend</option>
                                                    <option value="Desarrollador Fullstack">Desarrollador Fullstack</option>
                                                    <option value="Disenador UX/UI">Disenador UX/UI</option>
                                                    <option value="Arquitecto de Software">Arquitecto de Software</option>
                                                    <option value="Administrador de BD">Administrador de BD</option>
                                                    <option value="Tester QA">Tester QA</option>
                                                    <option value="Documentador">Documentador</option>
                                                    <option value="Investigador">Investigador</option>
                                                    <option value="Coordinador">Coordinador</option>
                                                    <option value="Consultor Tecnico">Consultor Tecnico</option>
                                                    <option value="Colaborador General">Colaborador General</option>
                                                </select>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeGroupModal()">Cancelar</button>
                    <button type="button" class="btn btn-primary" onclick="createNewGroup()">Crear Grupo</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.closeGroupModal = function() {
    const modal = document.querySelector('.group-modal');
    if (modal) modal.remove();
};

window.createNewGroup = async function() {
    const groupName = document.getElementById('groupName').value.trim();
    const projectName = document.getElementById('projectName').value.trim();
    const description = document.getElementById('groupDescription').value.trim();
    const deadline = document.getElementById('groupDeadline').value;

    if (!groupName || !projectName) {
        alert('Por favor completa los campos obligatorios');
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    // Validar miembros seleccionados
    const checkboxes = document.querySelectorAll('input[name="members"]:checked');
    const selectedMembers = [];
    let hasErrors = false;

    checkboxes.forEach(checkbox => {
        const userId = checkbox.value;
        const roleSelect = document.querySelector(`.member-role-select[data-user-id="${userId}"]`);
        const role = roleSelect ? roleSelect.value : '';
        
        if (!role) {
            hasErrors = true;
            roleSelect.style.borderColor = '#e74c3c';
            alert('Por favor asigna un rol a todos los miembros seleccionados');
            return;
        }

        selectedMembers.push({
            user_id: userId,
            name: roleSelect.closest('.user-selection-item').querySelector('.user-name').textContent,
            role: role,
            avatar: getInitials(roleSelect.closest('.user-selection-item').querySelector('.user-name').textContent)
        });
    });

    if (hasErrors) return;

    // Crear nuevo grupo en Supabase
    const newGroup = {
  nombre: groupName,
  nombre_del_proyecto: projectName,
  descripcion: description || 'Sin descripción',
  fecha_limite: deadline,
  creado_por: currentUser.id,
  creado_en: new Date().toISOString(),
  progreso: 0,
  miembros: [
    {
      user_id: currentUser.id,
      name: currentUser.full_name || currentUser.nombre,
      role: 'Líder de proyecto',
      avatar: getInitials(currentUser.full_name || currentUser.nombre)
    },
    ...selectedMembers
  ]
};


    const { error } = await supabase
        .from('grupos')
        .insert([newGroup]);

    if (error) {
        alert('Error al crear el grupo');
        return;
    }

    alert('Grupo "' + groupName + '" creado exitosamente');
    closeGroupModal();
    loadUserGroups();
};



// Funciones auxiliares
function formatDate(dateString) {
    if (!dateString) return 'No definida';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return 'No disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Cambia getUserName, getUserType, getUserEmail para que sean asíncronas y usen perfiles
async function getUserName(userId) {
    const users = await getUsers();
    const user = users.find(u => u.identificacion === userId);
    return user ? user.nombre : 'Usuario desconocido';
}
async function getUserType(userId) {
    const users = await getUsers();
    const user = users.find(u => u.identificacion === userId);
    return user ? (user.role === 'teacher' ? 'Docente' : 'Estudiante') : 'Tipo desconocido';
}
async function getUserEmail(userId) {
    // Si tienes email en perfiles, puedes devolverlo aquí
    return '';
}

function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

function showAlert(message, type) {
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alert = document.createElement('div');
    alert.className = 'alert alert-' + type;
    alert.textContent = message;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    if (type === 'success') {
        alert.style.background = '#27ae60';
    } else if (type === 'error') {
        alert.style.background = '#e74c3c';
    } else if (type === 'info') {
        alert.style.background = '#3498db';
    }
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 4000);
}

// Funciones globales
window.openGroupChat = function(groupId) {
    // Redirigir al chat con el grupo seleccionado
    window.location.href = 'chat.html?group=' + groupId;
};

window.viewGroupTasks = function(groupId) {
    // Redirigir a tareas filtradas por grupo
    window.location.href = 'tareas.html?group=' + groupId;
};

window.editGroup = function(groupId) {
    showAlert('Editar grupo - Funcionalidad completa en desarrollo', 'info');
};



// Agregar CSS dinámico
const groupsStyles = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .content-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 2rem;
        margin-top: 2rem;
    }

    .group-card {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
        border-left: 4px solid #3498db;
        display: flex;
        flex-direction: column;
    }
    
    .group-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 15px rgba(0,0,0,0.15);
    }
    
    .create-group {
        background: linear-gradient(135deg, #2c3e50, #3498db);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: 2px dashed rgba(255,255,255,0.3);
        min-height: 200px;
        border-left: 4px solid transparent;
    }
    
    .create-group-content {
        text-align: center;
    }
    
    .create-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        font-weight: 300;
    }
    
    .group-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
        flex-wrap: wrap;
        gap: 1rem;
    }
    
    .group-header h3 {
        color: #2c3e50;
        font-size: 1.3rem;
        margin-right: 1rem;
    }
    
    .project-tag {
        background: #ecf0f1;
        color: #2c3e50;
        padding: 0.3rem 0.8rem;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: 500;
        white-space: nowrap;
    }
    
    .group-description {
        color: #333;
        margin-bottom: 1.5rem;
        line-height: 1.5;
        flex: 1;
    }
    
    .group-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    
    .detail-item {
        display: flex;
        flex-direction: column;
    }
    
    .detail-label {
        font-size: 0.9rem;
        color: #7f8c8d;
        margin-bottom: 0.3rem;
    }
    
    .detail-value {
        font-weight: 600;
        color: #2c3e50;
    }
    
    .progress-section {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    
    .progress-bar {
        flex: 1;
        height: 8px;
        background: #ecf0f1;
        border-radius: 4px;
        overflow: hidden;
    }
    
    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #3498db, #2ecc71);
        border-radius: 4px;
        transition: width 0.3s ease;
    }
    
    .progress-text {
        font-weight: 600;
        color: #2c3e50;
        min-width: 40px;
        text-align: right;
    }

    .members-preview {
        margin-bottom: 1.5rem;
    }

    .members-title {
        font-size: 0.9rem;
        color: #7f8c8d;
        margin-bottom: 0.5rem;
    }

    .avatars-container {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .member-avatar-small {
        width: 35px;
        height: 35px;
        background: #3498db;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.8rem;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .group-actions {
        display: flex;
        gap: 0.8rem;
        margin-top: auto;
    }

    .group-actions .btn {
        flex: 1;
        padding: 10px 16px;
        font-size: 0.9rem;
    }
    
    /* Modal Styles */
    .group-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }
    
    .group-modal .modal-content {
        background: white;
        border-radius: 12px;
        padding: 0;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    
    .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid #ecf0f1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8f9fa;
        border-radius: 12px 12px 0 0;
    }
    
    .modal-header h3 {
        margin: 0;
        color: #2c3e50;
    }
    
    .close-modal {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #7f8c8d;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .close-modal:hover {
        color: #e74c3c;
        background: #f8f9fa;
        border-radius: 50%;
    }
    
    .modal-body {
        padding: 1.5rem;
    }
    
    .group-detail-section {
        margin-bottom: 2rem;
    }
    
    .group-detail-section h4 {
        color: #2c3e50;
        margin-bottom: 1rem;
        font-size: 1.1rem;
        border-bottom: 2px solid #3498db;
        padding-bottom: 0.5rem;
    }
    
    .detail-grid {
        display: grid;
        gap: 1rem;
    }
    
    .detail-grid .detail-item {
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 6px;
        border-left: 4px solid #3498db;
    }
    
    .progress-bar-small {
        width: 100px;
        height: 6px;
        background: #ecf0f1;
        border-radius: 3px;
        overflow: hidden;
        display: inline-block;
        margin: 0 8px;
        vertical-align: middle;
    }
    
    .members-detailed-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    
    .detailed-member {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #3498db;
    }
    
    .member-avatar-large {
        width: 50px;
        height: 50px;
        background: #3498db;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 1.1rem;
        flex-shrink: 0;
    }
    
    .member-details {
        flex: 1;
    }
    
    .member-name {
        font-weight: 600;
        color: #2c3e50;
        display: block;
    }
    
    .member-role {
        color: #3498db;
        font-weight: 500;
        display: block;
        margin: 0.2rem 0;
    }
    
    .member-email {
        color: #7f8c8d;
        font-size: 0.9rem;
        display: block;
    }
    
    .member-type {
        color: #95a5a6;
        font-size: 0.8rem;
        display: block;
        margin-top: 0.2rem;
    }
    
    .action-buttons {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
    }
    
    .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid #ecf0f1;
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
    }
    
    /* Form Styles */
    .form-group {
        margin-bottom: 1.5rem;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        color: #2c3e50;
        font-weight: 600;
    }
    
    .form-group input,
    .form-group textarea,
    .form-group select {
        width: 100%;
        padding: 0.8rem;
        border: 1px solid #dcdfe6;
        border-radius: 6px;
        font-size: 1rem;
        transition: border-color 0.3s ease;
    }
    
    .form-group input:focus,
    .form-group textarea:focus,
    .form-group select:focus {
        outline: none;
        border-color: #3498db;
        box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
    }
    
    .members-selection-container {
        border: 1px solid #dcdfe6;
        border-radius: 6px;
        padding: 1rem;
    }
    
    .selection-info {
        margin-bottom: 1rem;
    }
    
    .selection-info small {
        color: #7f8c8d;
    }
    
    .members-selection {
        max-height: 300px;
        overflow-y: auto;
    }
    
    .user-selection-item {
        padding: 1rem;
        border: 1px solid #ecf0f1;
        border-radius: 8px;
        margin-bottom: 0.8rem;
        transition: all 0.3s ease;
    }
    
    .user-selection-item.selected {
        border-color: #3498db;
        background: #f8f9fa;
    }
    
    .user-selection-item:hover {
        border-color: #bdc3c7;
    }
    
    .user-checkbox {
        display: flex;
        align-items: center;
        cursor: pointer;
        margin: 0;
        font-weight: normal;
    }
    
    .user-checkbox input[type="checkbox"] {
        display: none;
    }
    
    .checkmark {
        width: 20px;
        height: 20px;
        border: 2px solid #bdc3c7;
        border-radius: 4px;
        margin-right: 0.8rem;
        position: relative;
        transition: all 0.3s ease;
        flex-shrink: 0;
    }
    
    .user-checkbox input[type="checkbox"]:checked + .checkmark {
        background: #3498db;
        border-color: #3498db;
    }
    
    .user-checkbox input[type="checkbox"]:checked + .checkmark::after {
        content: '✓';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 12px;
        font-weight: bold;
    }
    
    .user-info {
        display: flex;
        flex-direction: column;
        flex: 1;
    }
    
    .user-name {
        font-weight: 600;
        color: #2c3e50;
    }
    
    .user-type {
        font-size: 0.9rem;
        color: #7f8c8d;
    }
    
    .user-email {
        font-size: 0.8rem;
        color: #95a5a6;
    }
    
    .role-selection {
        margin-top: 0.8rem;
        padding-left: 28px;
    }
    
    .role-selection label {
        display: block;
        margin-bottom: 0.3rem;
        font-size: 0.9rem;
        color: #7f8c8d;
    }
    
    .member-role-select {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #dcdfe6;
        border-radius: 4px;
        font-size: 0.9rem;
        transition: all 0.3s ease;
    }

    .member-role-select:disabled {
        background: #f8f9fa;
        color: #bdc3c7;
        cursor: not-allowed;
    }
    
    .no-groups {
        text-align: center;
        padding: 3rem;
        grid-column: 1 / -1;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .no-groups h3 {
        color: #2c3e50;
        margin-bottom: 1rem;
    }
    
    .no-groups p {
        color: #7f8c8d;
        margin-bottom: 2rem;
    }
    
    .btn {
        display: inline-block;
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        text-decoration: none;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .btn-primary {
        background: #3498db;
        color: white;
    }
    
    .btn-primary:hover {
        background: #2980b9;
    }
    
    .btn-secondary {
        background: #95a5a6;
        color: white;
    }
    
    .btn-secondary:hover {
        background: #7f8c8d;
    }
    
    .btn-outline {
        background: transparent;
        color: #3498db;
        border: 2px solid #3498db;
    }
    
    .btn-outline:hover {
        background: #3498db;
        color: white;
    }
    
    .btn-full {
        width: 100%;
    }
`;

// Injectar estilos
if (!document.querySelector('#groups-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'groups-styles';
    styleElement.textContent = groupsStyles;
    document.head.appendChild(styleElement);
}

console.log('Grupos.js cargado correctamente');

    // Tu código existente aquí...
    initializeGroups();