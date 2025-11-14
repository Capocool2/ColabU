// Sistema de Chat - ColabU
document.addEventListener('DOMContentLoaded', function() {
    initializeChat();
});

function initializeChat() {
    // Verificar autenticación
    if (!localStorage.getItem('currentUser')) {
        alert('Por favor inicia sesión primero');
        window.location.href = 'login.html';
        return;
    }

    // Obtener grupo de URL si existe
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('group');
    
    // Cargar conversaciones (grupos del usuario)
    loadConversations();
    
    // Configurar event listeners
    setupChatListeners();
    
    // Cargar mensajes del grupo activo o del primer grupo
    if (groupId) {
        const chatItem = document.querySelector(`.chat-item[data-group="${groupId}"]`);
        if (chatItem) {
            chatItem.click();
        }
    } else {
        loadActiveConversation();
    }

    // Simular usuarios en línea
    updateOnlineStatus();
}

function loadConversations() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    const groups = JSON.parse(localStorage.getItem('colabu_groups') || '[]');
    const userGroups = groups.filter(group => 
        group.members.some(member => member.user_id === currentUser.id)
    );

    displayConversations(userGroups);
}

function displayConversations(groups) {
    const chatList = document.querySelector('.chat-list');
    if (!chatList) return;

    chatList.innerHTML = '';

    if (groups.length === 0) {
        chatList.innerHTML = `
            <div class="no-conversations">
                <p>No tienes grupos activos</p>
                <p>Crea un grupo para empezar a chatear</p>
            </div>
        `;
        return;
    }

    groups.forEach(group => {
        const conversationElement = createConversationElement(group);
        chatList.appendChild(conversationElement);
    });

    // Activar el primer grupo por defecto
    const firstChat = chatList.querySelector('.chat-item');
    if (firstChat) {
        firstChat.classList.add('active');
        loadConversationMessages(parseInt(firstChat.getAttribute('data-group')));
    }
}

function createConversationElement(group) {
    const lastMessage = getLastMessage(group.id);
    const unreadCount = getUnreadCount(group.id);
    const isOnline = checkGroupOnlineStatus(group);

    const chatItem = document.createElement('div');
    chatItem.className = `chat-item ${isOnline ? 'online' : ''}`;
    chatItem.setAttribute('data-group', group.id);
    chatItem.innerHTML = `
        <div class="chat-avatar">${getInitials(group.name)}</div>
        <div class="chat-info">
            <h4>${group.name}</h4>
            <p>${lastMessage ? lastMessage.text : 'No hay mensajes aún'}</p>
            <span>${lastMessage ? formatTime(lastMessage.timestamp) : ''}</span>
        </div>
        ${unreadCount > 0 ? `<div class="unread-badge">${unreadCount}</div>` : ''}
        ${isOnline ? '<div class="online-indicator"></div>' : ''}
    `;

    return chatItem;
}

function getLastMessage(groupId) {
    const messages = JSON.parse(localStorage.getItem(`colabu_chat_${groupId}`) || '[]');
    return messages.length > 0 ? messages[messages.length - 1] : null;
}

function getUnreadCount(groupId) {
    // Simular mensajes no leídos (en un sistema real esto vendría de la base de datos)
    return Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : 0;
}

function checkGroupOnlineStatus(group) {
    // Simular estado en línea basado en actividad reciente
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const otherMembers = group.members.filter(member => member.user_id !== currentUser.id);
    return otherMembers.length > 0 && Math.random() > 0.3;
}

function setupChatListeners() {
    // Cambiar conversación
    const chatList = document.querySelector('.chat-list');
    if (chatList) {
        chatList.addEventListener('click', function(e) {
            const chatItem = e.target.closest('.chat-item');
            if (chatItem) {
                // Remover activo de todos
                document.querySelectorAll('.chat-item').forEach(item => {
                    item.classList.remove('active');
                });
                // Agregar activo al clickeado
                chatItem.classList.add('active');
                // Cargar mensajes de esta conversación
                const groupId = chatItem.getAttribute('data-group');
                loadConversationMessages(parseInt(groupId));
            }
        });
    }

    // Enviar mensaje
    const sendBtn = document.querySelector('.send-btn');
    const messageInput = document.querySelector('.message-text-input');
    
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    // Botón de menú (tres puntos)
    const menuBtn = document.querySelector('.conversation-actions .action-btn:last-child');
    if (menuBtn) {
        menuBtn.addEventListener('click', function() {
            showGroupMenu();
        });
    }
}

function loadActiveConversation() {
    const activeChat = document.querySelector('.chat-item.active');
    if (activeChat) {
        const groupId = parseInt(activeChat.getAttribute('data-group'));
        loadConversationMessages(groupId);
    }
}

function loadConversationMessages(groupId) {
    const groups = JSON.parse(localStorage.getItem('colabu_groups') || '[]');
    const group = groups.find(g => g.id === groupId);
    
    if (!group) return;

    // Actualizar header de la conversación
    updateConversationHeader(group);

    // Cargar mensajes del grupo
    const messages = JSON.parse(localStorage.getItem(`colabu_chat_${groupId}`) || '[]');
    
    // Si no hay mensajes, mostrar mensajes de ejemplo
    if (messages.length === 0) {
        const demoMessages = generateDemoMessages(group);
        displayMessages(demoMessages);
        localStorage.setItem(`colabu_chat_${groupId}`, JSON.stringify(demoMessages));
    } else {
        displayMessages(messages);
    }
}

function generateDemoMessages(group) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const otherMembers = group.members.filter(member => member.user_id !== currentUser.id);
    
    if (otherMembers.length === 0) return [];

    const demoMember = otherMembers[0];
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return [
        {
            id: 1,
            type: 'received',
            sender: demoMember.name,
            sender_id: demoMember.user_id,
            avatar: demoMember.avatar,
            text: 'Hola! Empecemos a coordinar el trabajo del proyecto ' + group.project_name,
            timestamp: yesterday.toISOString()
        },
        {
            id: 2,
            type: 'sent',
            sender: 'Tú',
            sender_id: currentUser.id,
            avatar: getInitials(currentUser.full_name),
            text: 'Perfecto! Ya tengo algunos avances que quiero compartir',
            timestamp: today.toISOString()
        },
        {
            id: 3,
            type: 'received',
            sender: demoMember.name,
            sender_id: demoMember.user_id,
            avatar: demoMember.avatar,
            text: 'Genial! Puedes subir los archivos al grupo cuando estén listos',
            timestamp: today.toISOString()
        }
    ];
}

function updateConversationHeader(group) {
    const conversationHeader = document.querySelector('.conversation-info');
    if (!conversationHeader) return;

    const onlineCount = Math.min(group.members.length - 1, Math.floor(Math.random() * 3) + 1);

    conversationHeader.innerHTML = `
        <div class="group-avatar">${getInitials(group.name)}</div>
        <div>
            <h3>${group.name}</h3>
            <p>${onlineCount} miembros en línea</p>
        </div>
    `;
}

function displayMessages(messages) {
    const container = document.querySelector('.messages-container');
    if (!container) return;

    // Agrupar mensajes por día
    const groupedMessages = groupMessagesByDay(messages);
    
    container.innerHTML = '';
    
    // Agregar mensajes agrupados por día
    Object.keys(groupedMessages).forEach(date => {
        // Agregar divisor de día
        const dayDivider = document.createElement('div');
        dayDivider.className = 'message-day';
        dayDivider.textContent = formatMessageDate(date);
        container.appendChild(dayDivider);
        
        // Agregar mensajes del día
        groupedMessages[date].forEach(msg => {
            const messageEl = createMessageElement(msg);
            container.appendChild(messageEl);
        });
    });
    
    // Scroll al final
    container.scrollTop = container.scrollHeight;
}

function groupMessagesByDay(messages) {
    const grouped = {};
    
    messages.forEach(msg => {
        const date = new Date(msg.timestamp).toDateString();
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(msg);
    });
    
    return grouped;
}

function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.type}`;
    
    if (message.type === 'received') {
        messageDiv.innerHTML = `
            <div class="message-avatar">${message.avatar}</div>
            <div class="message-content">
                <div class="message-sender">${message.sender}</div>
                <div class="message-text">${message.text}</div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">${message.text}</div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            </div>
            <div class="message-avatar">${message.avatar}</div>
        `;
    }
    
    return messageDiv;
}

function sendMessage() {
    const input = document.querySelector('.message-text-input');
    const text = input.value.trim();
    
    if (!text) return;

    const activeChat = document.querySelector('.chat-item.active');
    if (!activeChat) return;

    const groupId = parseInt(activeChat.getAttribute('data-group'));
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    const newMessage = {
        id: Date.now(),
        type: 'sent',
        sender: 'Tú',
        sender_id: currentUser.id,
        avatar: getInitials(currentUser.full_name),
        text: text,
        timestamp: new Date().toISOString()
    };
    
    // Agregar mensaje al almacenamiento
    const messages = JSON.parse(localStorage.getItem(`colabu_chat_${groupId}`) || '[]');
    messages.push(newMessage);
    localStorage.setItem(`colabu_chat_${groupId}`, JSON.stringify(messages));
    
    // Agregar mensaje a la UI
    const messageEl = createMessageElement(newMessage);
    document.querySelector('.messages-container').appendChild(messageEl);
    
    // Limpiar input
    input.value = '';
    
    // Scroll al final
    const container = document.querySelector('.messages-container');
    container.scrollTop = container.scrollHeight;

    // Simular respuesta automática después de 1-3 segundos
    setTimeout(() => {
        simulateResponse(groupId);
    }, 1000 + Math.random() * 2000);
}

function simulateResponse(groupId) {
    const groups = JSON.parse(localStorage.getItem('colabu_groups') || '[]');
    const group = groups.find(g => g.id === groupId);
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!group) return;

    const otherMembers = group.members.filter(member => member.user_id !== currentUser.id);
    if (otherMembers.length === 0) return;

    const randomMember = otherMembers[Math.floor(Math.random() * otherMembers.length)];
    const responses = [
        'De acuerdo, lo revisaré',
        'Perfecto, continuemos con el siguiente punto',
        'Tengo una pregunta sobre eso',
        'Puedes enviarme más detalles?',
        'Excelente trabajo!',
        'Necesitamos coordinar una reunión para esto',
        'Tengo algunos comentarios al respecto',
        'Avancemos con el siguiente objetivo'
    ];

    const responseMessage = {
        id: Date.now(),
        type: 'received',
        sender: randomMember.name,
        sender_id: randomMember.user_id,
        avatar: randomMember.avatar,
        text: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString()
    };

    // Agregar respuesta al almacenamiento
    const messages = JSON.parse(localStorage.getItem(`colabu_chat_${groupId}`) || '[]');
    messages.push(responseMessage);
    localStorage.setItem(`colabu_chat_${groupId}`, JSON.stringify(messages));
    
    // Solo agregar a la UI si esta conversación está activa
    const activeChat = document.querySelector('.chat-item.active');
    if (activeChat && parseInt(activeChat.getAttribute('data-group')) === groupId) {
        const messageEl = createMessageElement(responseMessage);
        document.querySelector('.messages-container').appendChild(messageEl);
        
        // Scroll al final
        const container = document.querySelector('.messages-container');
        container.scrollTop = container.scrollHeight;

        // Actualizar última conversación en la lista
        updateLastMessage(groupId, responseMessage.text);
    }
}

function updateLastMessage(groupId, lastMessage) {
    const chatItem = document.querySelector(`.chat-item[data-group="${groupId}"]`);
    if (chatItem) {
        const chatInfo = chatItem.querySelector('.chat-info p');
        const chatTime = chatItem.querySelector('.chat-info span');
        
        if (chatInfo) chatInfo.textContent = lastMessage;
        if (chatTime) chatTime.textContent = 'Ahora';
    }
}

function showGroupMenu() {
    const activeChat = document.querySelector('.chat-item.active');
    if (!activeChat) return;

    const groupId = parseInt(activeChat.getAttribute('data-group'));
    const groups = JSON.parse(localStorage.getItem('colabu_groups') || '[]');
    const group = groups.find(g => g.id === groupId);
    
    if (!group) return;

    const modalHTML = `
        <div class="modal-overlay active">
            <div class="modal-container">
                <div class="modal-header">
                    <h2>Información del Grupo</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-content">
                    <div class="group-info-section">
                        <div class="group-header-modal">
                            <div class="group-avatar-large">${getInitials(group.name)}</div>
                            <div class="group-details">
                                <h3>${group.name}</h3>
                                <p class="project-name">${group.project_name}</p>
                                <p class="member-count">${group.members.length} miembros</p>
                            </div>
                        </div>
                        
                        <div class="description-section">
                            <h4>Descripción del Proyecto</h4>
                            <p>${group.description || 'No hay descripción disponible'}</p>
                        </div>
                    </div>

                    <div class="members-section">
                        <h4>Miembros del Grupo</h4>
                        <div class="members-list-modal">
                            ${group.members.map(member => {
                                const isOnline = checkMemberOnlineStatus(member.user_id);
                                const isCurrentUser = member.user_id === JSON.parse(localStorage.getItem('currentUser')).id;
                                return `
                                    <div class="member-item ${isOnline ? 'online' : ''} ${isCurrentUser ? 'current-user' : ''}">
                                        <div class="member-avatar">${member.avatar}</div>
                                        <div class="member-info">
                                            <div class="member-name">
                                                ${member.name}
                                                ${isCurrentUser ? ' (Tú)' : ''}
                                            </div>
                                            <div class="member-role">${member.role}</div>
                                        </div>
                                        <div class="member-status">
                                            <div class="status-indicator ${isOnline ? 'online' : 'offline'}"></div>
                                            <span class="status-text">${isOnline ? 'En línea' : 'Desconectado'}</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <div class="files-section">
                        <h4>Archivos del Proyecto</h4>
                        <div class="files-list">
                            ${getGroupFiles(groupId).map(file => `
                                <div class="file-item">
                                    <div class="file-icon">${getFileIcon(file.name)}</div>
                                    <div class="file-info">
                                        <div class="file-name">${file.name}</div>
                                        <div class="file-details">${file.size} • ${file.date}</div>
                                    </div>
                                </div>
                            `).join('')}
                            ${getGroupFiles(groupId).length === 0 ? 
                                '<p class="no-files">No hay archivos compartidos aún</p>' : ''}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" onclick="closeModal()">Cerrar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setupModalEvents();
}

function getGroupFiles(groupId) {
    // Simular archivos del grupo
    const fileTypes = ['pdf', 'docx', 'xlsx', 'jpg', 'png', 'zip'];
    const fileNames = [
        'Documentación del proyecto',
        'Presentación final',
        'Análisis de requerimientos',
        'Diseño de interfaz',
        'Plan de trabajo',
        'Presupuesto detallado'
    ];

    return Array.from({length: 3}, (_, i) => ({
        name: `${fileNames[i]}.${fileTypes[i]}`,
        size: `${Math.floor(Math.random() * 5) + 1} MB`,
        date: 'Hoy'
    }));
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'pdf': '📄',
        'doc': '📝',
        'docx': '📝',
        'xlsx': '📊',
        'jpg': '🖼️',
        'jpeg': '🖼️',
        'png': '🖼️',
        'zip': '📦'
    };
    return icons[ext] || '📎';
}

function checkMemberOnlineStatus(userId) {
    // Simular estado en línea (50% de probabilidad)
    // En un sistema real, esto verificaría la última actividad del usuario
    return Math.random() > 0.5;
}

function updateOnlineStatus() {
    // Simular actualización de estado en línea cada 30 segundos
    setInterval(() => {
        const chatItems = document.querySelectorAll('.chat-item');
        chatItems.forEach(item => {
            if (Math.random() > 0.7) {
                item.classList.toggle('online');
            }
        });
    }, 30000);
}

function setupModalEvents() {
    const closeBtn = document.querySelector('.modal-close');
    const overlay = document.querySelector('.modal-overlay');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }

    // Cerrar con ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Funciones auxiliares
function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Menos de 1 minuto
        return 'Ahora';
    } else if (diff < 3600000) { // Menos de 1 hora
        const minutes = Math.floor(diff / 60000);
        return `Hace ${minutes} min`;
    } else if (diff < 86400000) { // Menos de 1 día
        const hours = Math.floor(diff / 3600000);
        return `Hace ${hours} h`;
    } else {
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
}

function formatMessageDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Ayer';
    } else {
        return date.toLocaleDateString('es-ES', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Hacer funciones globales
window.closeModal = closeModal;

// Agregar CSS para los nuevos elementos
const chatStyles = `
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 20px;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
    }

    .modal-overlay.active {
        opacity: 1;
        visibility: visible;
    }

    .modal-container {
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        transform: translateY(-20px);
        transition: transform 0.3s ease;
    }

    .modal-overlay.active .modal-container {
        transform: translateY(0);
    }

    .modal-header {
        padding: 24px 30px 20px;
        border-bottom: 1px solid #e9ecef;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8f9fa;
        border-radius: 12px 12px 0 0;
    }

    .modal-header h2 {
        margin: 0;
        color: #2c3e50;
        font-size: 1.5rem;
        font-weight: 600;
    }

    .modal-close {
        background: none;
        border: none;
        font-size: 1.8rem;
        cursor: pointer;
        color: #6c757d;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: all 0.3s ease;
    }

    .modal-close:hover {
        background: #e9ecef;
        color: #495057;
    }

    .modal-content {
        padding: 30px;
        flex: 1;
        overflow-y: auto;
    }

    .modal-footer {
        padding: 20px 30px;
        border-top: 1px solid #e9ecef;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        background: #f8f9fa;
        border-radius: 0 0 12px 12px;
    }

    .group-info-section {
        margin-bottom: 25px;
    }

    .group-header-modal {
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 20px;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
    }

    .group-avatar-large {
        width: 60px;
        height: 60px;
        background: #3498db;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 1.2rem;
        flex-shrink: 0;
    }

    .group-details h3 {
        margin: 0 0 5px 0;
        color: #2c3e50;
        font-size: 1.3rem;
    }

    .project-name {
        margin: 0 0 3px 0;
        color: #495057;
        font-weight: 500;
    }

    .member-count {
        margin: 0;
        color: #6c757d;
        font-size: 0.9rem;
    }

    .description-section {
        margin-bottom: 20px;
    }

    .description-section h4 {
        margin: 0 0 10px 0;
        color: #495057;
        font-size: 1.1rem;
    }

    .description-section p {
        margin: 0;
        color: #6c757d;
        line-height: 1.5;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 6px;
    }

    .members-section {
        margin-bottom: 25px;
    }

    .members-section h4 {
        margin: 0 0 15px 0;
        color: #495057;
        font-size: 1.1rem;
    }

    .members-list-modal {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .member-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        transition: all 0.3s ease;
    }

    .member-item:hover {
        background: #f8f9fa;
    }

    .member-item.online {
        border-left: 4px solid #28a745;
    }

    .member-item.current-user {
        background: #e3f2fd;
        border-color: #3498db;
    }

    .member-avatar {
        width: 40px;
        height: 40px;
        background: #6c757d;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.9rem;
        flex-shrink: 0;
    }

    .member-item.online .member-avatar {
        background: #28a745;
    }

    .member-info {
        flex: 1;
    }

    .member-name {
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 2px;
    }

    .member-role {
        font-size: 0.85rem;
        color: #6c757d;
    }

    .member-status {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }

    .status-indicator.online {
        background: #28a745;
    }

    .status-indicator.offline {
        background: #6c757d;
    }

    .status-text {
        font-size: 0.8rem;
        color: #6c757d;
        white-space: nowrap;
    }

    .files-section h4 {
        margin: 0 0 15px 0;
        color: #495057;
        font-size: 1.1rem;
    }

    .files-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .file-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        transition: all 0.3s ease;
    }

    .file-item:hover {
        background: #f8f9fa;
    }

    .file-icon {
        font-size: 1.2rem;
        flex-shrink: 0;
    }

    .file-info {
        flex: 1;
    }

    .file-name {
        font-weight: 500;
        color: #495057;
        margin-bottom: 2px;
    }

    .file-details {
        font-size: 0.8rem;
        color: #6c757d;
    }

    .no-files {
        text-align: center;
        color: #6c757d;
        font-style: italic;
        padding: 20px;
    }

    .chat-item {
        position: relative;
    }

    .online-indicator {
        position: absolute;
        top: 12px;
        left: 12px;
        width: 8px;
        height: 8px;
        background: #28a745;
        border-radius: 50%;
        border: 2px solid white;
    }

    .chat-item.online .chat-avatar {
        border: 2px solid #28a745;
    }

    .unread-badge {
        position: absolute;
        top: 12px;
        right: 15px;
        background: #e74c3c;
        color: white;
        border-radius: 10px;
        padding: 2px 6px;
        font-size: 0.7rem;
        font-weight: 600;
        min-width: 18px;
        text-align: center;
    }

    .no-conversations {
        text-align: center;
        padding: 40px 20px;
        color: #6c757d;
    }

    .no-conversations p {
        margin: 5px 0;
    }

    .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .btn-primary {
        background: #3498db;
        color: white;
    }

    .btn-primary:hover {
        background: #2980b9;
        transform: translateY(-1px);
    }
`;

// Injectar estilos
if (!document.querySelector('#chat-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'chat-styles';
    styleElement.textContent = chatStyles;
    document.head.appendChild(styleElement);
}

// Actualizar el HTML del chat para quitar elementos no necesarios
document.addEventListener('DOMContentLoaded', function() {
    // Quitar botón "Nuevo" del header del chat
    const newChatBtn = document.querySelector('.new-chat-btn');
    if (newChatBtn) {
        newChatBtn.remove();
    }

    // Quitar panel de información del grupo
    const infoPanel = document.querySelector('.chat-info-panel');
    if (infoPanel) {
        infoPanel.remove();
    }

    // Actualizar layout del chat
    const chatLayout = document.querySelector('.chat-layout');
    if (chatLayout) {
        chatLayout.style.gridTemplateColumns = '350px 1fr';
    }
});

console.log('Chat.js cargado correctamente');