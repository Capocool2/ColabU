// Sistema de Chat - ColabU con Supabase
import { supabase } from './supabaseClient.js';

let currentGroupId = null;
let messageSubscription = null;
let groupsSubscriptionForChat = null;

document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    if (!localStorage.getItem('currentUser')) {
        alert('Por favor inicia sesión primero');
        window.location.href = 'login.html';
        return;
    }

    initializeChat();
});

async function initializeChat() {
    // Obtener grupo de URL si existe
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('group');
    
    // Cargar conversaciones (grupos del usuario)
    await loadConversations();
    
    // Configurar event listeners
    setupChatListeners();
    
    // Configurar suscripción en tiempo real para grupos
    setupGroupsRealtimeSubscription();
    
    // Cargar mensajes del grupo activo o del primer grupo
    if (groupId) {
        const chatItem = document.querySelector(`.chat-item[data-group="${groupId}"]`);
        if (chatItem) {
            chatItem.click();
        }
    } else {
        await loadActiveConversation();
    }

    // Actualizar información del usuario
    updateUserInfo();
}

// Configurar suscripción en tiempo real para grupos (actualizar lista de conversaciones)
function setupGroupsRealtimeSubscription() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    // Cancelar suscripción anterior si existe
    if (groupsSubscriptionForChat) {
        supabase.removeChannel(groupsSubscriptionForChat);
    }

    // Suscribirse a cambios en la tabla grupos
    groupsSubscriptionForChat = supabase
        .channel('grupos-for-chat-changes')
        .on(
            'postgres_changes',
            {
                event: '*', // INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'grupos'
            },
            (payload) => {
                console.log('Cambio en grupos (chat) detectado:', payload);
                // Recargar conversaciones cuando haya cambios
                loadConversations();
            }
        )
        .subscribe((status) => {
            console.log('Estado de suscripción grupos (chat):', status);
            if (status === 'SUBSCRIBED') {
                console.log('✅ Suscripción a grupos (chat) activa');
            }
        });
}

// Limpiar suscripciones al salir de la página
window.addEventListener('beforeunload', () => {
    if (messageSubscription) {
        supabase.removeChannel(messageSubscription);
    }
    if (groupsSubscriptionForChat) {
        supabase.removeChannel(groupsSubscriptionForChat);
    }
});

async function loadConversations() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    try {
        const currentUserId = currentUser.id;

        // Obtener grupos desde Supabase
        const { data: allGroups, error: groupsError } = await supabase
            .from('grupos')
            .select('identificacion, nombre, nombre_del_proyecto, miembros, creado_por')
            .order('creado_en', { ascending: false });

        if (groupsError) {
            console.error('Error cargando grupos:', groupsError);
            return;
        }

        // Filtrar grupos donde el usuario es miembro o creador
        const userGroups = (allGroups || []).filter(group => {
            if (group.creado_por === currentUserId) return true;
            if (group.miembros && Array.isArray(group.miembros)) {
                return group.miembros.some(member => {
                    if (typeof member === 'object' && member.user_id) {
                        return member.user_id === currentUserId;
                    }
                    return member === currentUserId;
                });
            }
            return false;
        });

        // Obtener último mensaje de cada grupo
        const groupsWithLastMessage = await Promise.all(
            userGroups.map(async (group) => {
                const lastMessage = await getLastMessage(group.identificacion);
                return { ...group, lastMessage };
            })
        );

        displayConversations(groupsWithLastMessage);
    } catch (error) {
        console.error('Error en loadConversations:', error);
    }
}

async function getLastMessage(groupId) {
    try {
        const { data, error } = await supabase
            .from('mensajes')
            .select('mensaje, creado_en, usuario_id')
            .eq('grupo_id', groupId)
            .order('creado_en', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) return null;

        // Obtener nombre del usuario
        const { data: user } = await supabase
            .from('usuarios')
            .select('nombre')
            .eq('id', data.usuario_id)
            .single();

        return {
            text: data.mensaje,
            timestamp: data.creado_en,
            sender: user?.nombre || 'Usuario'
        };
    } catch (error) {
        return null;
    }
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

    // Activar el primer grupo por defecto si no hay uno activo
    const activeChat = chatList.querySelector('.chat-item.active');
    if (!activeChat && groups.length > 0) {
        const firstChat = chatList.querySelector('.chat-item');
        if (firstChat) {
            firstChat.classList.add('active');
            loadConversationMessages(firstChat.getAttribute('data-group'));
        }
    }
}

function createConversationElement(group) {
    const lastMessage = group.lastMessage;
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.setAttribute('data-group', group.identificacion);
    chatItem.innerHTML = `
        <div class="chat-avatar">${getInitials(group.nombre)}</div>
        <div class="chat-info">
            <h4>${escapeHtml(group.nombre)}</h4>
            <p>${lastMessage ? escapeHtml(lastMessage.sender + ': ' + lastMessage.text) : 'No hay mensajes aún'}</p>
            <span>${lastMessage ? formatTime(lastMessage.timestamp) : ''}</span>
        </div>
    `;

    return chatItem;
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
                loadConversationMessages(groupId);
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
    const menuBtn = document.querySelector('.conversation-actions .action-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', function() {
            showGroupMenu();
        });
    }
}

async function loadActiveConversation() {
    const activeChat = document.querySelector('.chat-item.active');
    if (activeChat) {
        const groupId = activeChat.getAttribute('data-group');
        await loadConversationMessages(groupId);
    }
}

async function loadConversationMessages(groupId) {
    if (!groupId) return;

    currentGroupId = groupId;

    try {
        // Obtener información del grupo desde Supabase
        const { data: group, error: groupError } = await supabase
            .from('grupos')
            .select('identificacion, nombre, nombre_del_proyecto, miembros, creado_por')
            .eq('identificacion', groupId)
            .single();

        if (groupError || !group) {
            console.error('Error cargando grupo:', groupError);
            return;
        }

        // Actualizar header de la conversación
        await updateConversationHeader(group);

        // Cargar mensajes del grupo desde Supabase
        const { data: messages, error: messagesError } = await supabase
            .from('mensajes')
            .select('id, mensaje, creado_en, usuario_id')
            .eq('grupo_id', groupId)
            .order('creado_en', { ascending: true });

        if (messagesError) {
            console.error('Error cargando mensajes:', messagesError);
            return;
        }

        // Obtener información de usuarios para los mensajes
        const userIds = [...new Set(messages.map(m => m.usuario_id))];
        let usersMap = {};
        
        if (userIds.length > 0) {
            const { data: users } = await supabase
                .from('usuarios')
                .select('id, nombre')
                .in('id', userIds);

            if (users) {
                usersMap = users.reduce((acc, user) => {
                    acc[user.id] = user;
                    return acc;
                }, {});
            }
        }

        // Formatear mensajes
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const formattedMessages = messages.map(msg => {
            const user = usersMap[msg.usuario_id];
            const isSent = msg.usuario_id === currentUser.id;
            
            return {
                id: msg.id,
                type: isSent ? 'sent' : 'received',
                sender: isSent ? 'Tú' : (user?.nombre || 'Usuario'),
                sender_id: msg.usuario_id,
                avatar: getInitials(user?.nombre || 'Usuario'),
                text: msg.mensaje,
                timestamp: msg.creado_en
            };
        });

        displayMessages(formattedMessages);

        // Suscribirse a nuevos mensajes
        subscribeToMessages(groupId);
    } catch (error) {
        console.error('Error en loadConversationMessages:', error);
    }
}

function subscribeToMessages(groupId) {
    // Cancelar suscripción anterior si existe
    if (messageSubscription) {
        supabase.removeChannel(messageSubscription);
    }

    // Suscribirse a nuevos mensajes
    messageSubscription = supabase
        .channel(`messages:${groupId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'mensajes',
            filter: `grupo_id=eq.${groupId}`
        }, async (payload) => {
            const newMessage = payload.new;
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            
            // Obtener información del usuario
            const { data: user } = await supabase
                .from('usuarios')
                .select('id, nombre')
                .eq('id', newMessage.usuario_id)
                .single();

            const isSent = newMessage.usuario_id === currentUser.id;
            
            const formattedMessage = {
                id: newMessage.id,
                type: isSent ? 'sent' : 'received',
                sender: isSent ? 'Tú' : (user?.nombre || 'Usuario'),
                sender_id: newMessage.usuario_id,
                avatar: getInitials(user?.nombre || 'Usuario'),
                text: newMessage.mensaje,
                timestamp: newMessage.creado_en
            };

            // Solo agregar si estamos viendo esta conversación
            if (currentGroupId === groupId) {
                const messageEl = createMessageElement(formattedMessage);
                const container = document.querySelector('.messages-container');
                container.appendChild(messageEl);
                container.scrollTop = container.scrollHeight;
            }

            // Actualizar última conversación en la lista
            updateLastMessage(groupId, formattedMessage.text, formattedMessage.sender);
        })
        .subscribe();
}

async function updateConversationHeader(group) {
    const conversationHeader = document.querySelector('.conversation-info');
    if (!conversationHeader) return;

    const memberCount = (group.miembros || []).length;
    const onlineCount = Math.min(memberCount, Math.floor(Math.random() * 3) + 1);

    conversationHeader.innerHTML = `
        <div class="group-avatar">${getInitials(group.nombre)}</div>
        <div>
            <h3>${escapeHtml(group.nombre)}</h3>
            <p>${memberCount} miembros</p>
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
            <div class="message-avatar">${escapeHtml(message.avatar)}</div>
            <div class="message-content">
                <div class="message-sender">${escapeHtml(message.sender)}</div>
                <div class="message-text">${escapeHtml(message.text)}</div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">${escapeHtml(message.text)}</div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            </div>
            <div class="message-avatar">${escapeHtml(message.avatar)}</div>
        `;
    }
    
    return messageDiv;
}

async function sendMessage() {
    const input = document.querySelector('.message-text-input');
    const text = input.value.trim();
    
    if (!text) return;

    const activeChat = document.querySelector('.chat-item.active');
    if (!activeChat) return;

    const groupId = activeChat.getAttribute('data-group');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!groupId || !currentUser) return;

    try {
        // Guardar mensaje en Supabase
        const { data, error } = await supabase
            .from('mensajes')
            .insert([{
                grupo_id: groupId,
                usuario_id: currentUser.id,
                mensaje: text,
                leido: false
            }])
            .select()
            .single();

        if (error) {
            console.error('Error enviando mensaje:', error);
            alert('Error al enviar el mensaje');
            return;
        }

        // Limpiar input
        input.value = '';
        
        // El mensaje se agregará automáticamente a través de la suscripción
        // Pero también podemos agregarlo manualmente para feedback inmediato
        const newMessage = {
            id: data.id,
            type: 'sent',
            sender: 'Tú',
            sender_id: currentUser.id,
            avatar: getInitials(currentUser.full_name || currentUser.nombre || 'Usuario'),
            text: text,
            timestamp: data.creado_en
        };

        const messageEl = createMessageElement(newMessage);
        const container = document.querySelector('.messages-container');
        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;

        // Actualizar última conversación en la lista
        updateLastMessage(groupId, text, 'Tú');
    } catch (error) {
        console.error('Error en sendMessage:', error);
        alert('Error al enviar el mensaje');
    }
}

async function updateLastMessage(groupId, lastMessageText, sender) {
    const chatItem = document.querySelector(`.chat-item[data-group="${groupId}"]`);
    if (chatItem) {
        const chatInfo = chatItem.querySelector('.chat-info p');
        const chatTime = chatItem.querySelector('.chat-info span');
        
        if (chatInfo) {
            const displayText = sender === 'Tú' ? lastMessageText : `${sender}: ${lastMessageText}`;
            chatInfo.textContent = displayText.length > 50 ? displayText.substring(0, 50) + '...' : displayText;
        }
        if (chatTime) chatTime.textContent = 'Ahora';
    }
}

async function showGroupMenu() {
    const activeChat = document.querySelector('.chat-item.active');
    if (!activeChat) return;

    const groupId = activeChat.getAttribute('data-group');

    try {
        // Obtener información del grupo desde Supabase
        const { data: group, error } = await supabase
            .from('grupos')
            .select('identificacion, nombre, nombre_del_proyecto, descripcion, miembros, creado_por')
            .eq('identificacion', groupId)
            .single();

        if (error || !group) {
            console.error('Error cargando grupo:', error);
            return;
        }

        // Obtener información de usuarios para los miembros
        const memberIds = (group.miembros || []).map(m => typeof m === 'object' ? m.user_id : m).filter(Boolean);
        let memberDetails = [];
        
        if (memberIds.length > 0) {
            const { data: users } = await supabase
                .from('usuarios')
                .select('id, nombre, correo, rol')
                .in('id', memberIds);
            
            memberDetails = users || [];
        }

        const currentUser = JSON.parse(localStorage.getItem('currentUser'));

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
                                <div class="group-avatar-large">${getInitials(group.nombre)}</div>
                                <div class="group-details">
                                    <h3>${escapeHtml(group.nombre)}</h3>
                                    <p class="project-name">${escapeHtml(group.nombre_del_proyecto || 'Sin proyecto')}</p>
                                    <p class="member-count">${(group.miembros || []).length} miembros</p>
                                </div>
                            </div>
                            
                            <div class="description-section">
                                <h4>Descripción del Proyecto</h4>
                                <p>${escapeHtml(group.descripcion || 'No hay descripción disponible')}</p>
                            </div>
                        </div>

                        <div class="members-section">
                            <h4>Miembros del Grupo</h4>
                            <div class="members-list-modal">
                                ${(group.miembros || []).map(member => {
                                    const memberId = typeof member === 'object' ? member.user_id : member;
                                    const userInfo = memberDetails.find(u => u.id === memberId);
                                    const memberName = typeof member === 'object' ? member.name : (userInfo?.nombre || 'Usuario');
                                    const memberRole = typeof member === 'object' ? member.role : 'Sin rol';
                                    const isCurrentUser = memberId === currentUser.id;
                                    const isOnline = Math.random() > 0.5; // Simulado
                                    
                                    return `
                                        <div class="member-item ${isOnline ? 'online' : ''} ${isCurrentUser ? 'current-user' : ''}">
                                            <div class="member-avatar">${getInitials(memberName)}</div>
                                            <div class="member-info">
                                                <div class="member-name">
                                                    ${escapeHtml(memberName)}
                                                    ${isCurrentUser ? ' (Tú)' : ''}
                                                </div>
                                                <div class="member-role">${escapeHtml(memberRole)}</div>
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
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" onclick="closeModal()">Cerrar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        setupModalEvents();
    } catch (error) {
        console.error('Error en showGroupMenu:', error);
    }
}

function updateUserInfo() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user) {
        const userNameEl = document.getElementById('userName');
        const userAvatarEl = document.getElementById('userAvatar');
        
        if (userNameEl) {
            userNameEl.textContent = user.full_name || user.nombre || 'Usuario';
        }
        if (userAvatarEl) {
            userAvatarEl.textContent = getInitials(user.full_name || user.nombre || 'Usuario');
        }
    }
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
    if (!name) return '??';
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

function formatTime(timestamp) {
    if (!timestamp) return '';
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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Hacer funciones globales
window.closeModal = closeModal;

// CSS adicional
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

// Limpiar suscripción al salir
window.addEventListener('beforeunload', () => {
    if (messageSubscription) {
        supabase.removeChannel(messageSubscription);
    }
});

console.log('Chat.js cargado correctamente con Supabase');

console.log('Chat.js cargado correctamente');