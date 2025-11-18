// Calendario de Proyectos - ColabU con Supabase
import { supabase } from './supabaseClient.js';

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

// Variables para almacenar suscripciones de Realtime
let calendarGroupsSubscription = null;
let calendarTasksSubscription = null;

document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    if (!localStorage.getItem('currentUser')) {
        alert('Por favor inicia sesión primero');
        window.location.href = 'login.html';
        return;
    }
    
    console.log('Calendario inicializando...');
    initializeCalendar();
});

async function initializeCalendar() {
    // Configurar calendario
    setupCalendarNavigation();
    await loadCalendarData();
    displayMonthCalendar(currentYear, currentMonth);
    
    // Configurar suscripciones en tiempo real
    setupCalendarRealtimeSubscriptions();
    
    console.log('Calendario listo!');
}

// Configurar suscripciones en tiempo real para calendario
function setupCalendarRealtimeSubscriptions() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    // Cancelar suscripciones anteriores si existen
    if (calendarGroupsSubscription) {
        supabase.removeChannel(calendarGroupsSubscription);
    }
    if (calendarTasksSubscription) {
        supabase.removeChannel(calendarTasksSubscription);
    }

    // Suscribirse a cambios en grupos
    calendarGroupsSubscription = supabase
        .channel('grupos-for-calendar-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'grupos'
            },
            (payload) => {
                console.log('Cambio en grupos (calendario) detectado:', payload);
                // Recargar datos del calendario
                loadCalendarData().then(() => {
                    displayMonthCalendar(currentYear, currentMonth);
                });
            }
        )
        .subscribe((status) => {
            console.log('Estado de suscripción grupos (calendario):', status);
            if (status === 'SUBSCRIBED') {
                console.log('✅ Suscripción a grupos (calendario) activa');
            }
        });

    // Suscribirse a cambios en tareas
    calendarTasksSubscription = supabase
        .channel('tareas-for-calendar-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'tareas'
            },
            (payload) => {
                console.log('Cambio en tareas (calendario) detectado:', payload);
                // Recargar datos del calendario
                loadCalendarData().then(() => {
                    displayMonthCalendar(currentYear, currentMonth);
                });
            }
        )
        .subscribe((status) => {
            console.log('Estado de suscripción tareas (calendario):', status);
            if (status === 'SUBSCRIBED') {
                console.log('✅ Suscripción a tareas (calendario) activa');
            }
        });
}

// Limpiar suscripciones al salir de la página
window.addEventListener('beforeunload', () => {
    if (calendarGroupsSubscription) {
        supabase.removeChannel(calendarGroupsSubscription);
    }
    if (calendarTasksSubscription) {
        supabase.removeChannel(calendarTasksSubscription);
    }
});

async function loadCalendarData() {
    await loadAllEvents();
}

async function loadAllEvents() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    try {
        const currentUserId = currentUser.id;

        // Obtener grupos del usuario
        const { data: allGroups, error: groupsError } = await supabase
            .from('grupos')
            .select('identificacion, nombre, nombre_del_proyecto, fecha_limite, miembros, creado_por');

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

        const userGroupIds = userGroups.map(g => g.identificacion);

        // Obtener tareas de los grupos del usuario
        let userTasks = [];
        if (userGroupIds.length > 0) {
            const { data: tasks, error: tasksError } = await supabase
                .from('tareas')
                .select('id, titulo, descripcion, fecha_limite, proyecto_id, completada, estado')
                .in('proyecto_id', userGroupIds)
                .not('fecha_limite', 'is', null);

            if (!tasksError && tasks) {
                userTasks = tasks;
            }
        }

        // Generar eventos desde tareas y grupos
        const events = [];

        // Eventos desde tareas (fechas límite)
        userTasks.forEach(task => {
            if (task.fecha_limite) {
                const group = userGroups.find(g => g.identificacion === task.proyecto_id);
                events.push({
                    id: `task-${task.id}`,
                    title: task.titulo,
                    description: task.descripcion || 'Sin descripción',
                    event_date: task.fecha_limite,
                    event_type: task.completada ? 'completed' : 'deadline',
                    group_name: group ? group.nombre : 'Sin grupo',
                    group_id: task.proyecto_id,
                    task_id: task.id,
                    is_completed: task.completada
                });
            }
        });

        // Eventos desde grupos (fechas límite de proyecto)
        userGroups.forEach(group => {
            if (group.fecha_limite) {
                events.push({
                    id: `group-${group.identificacion}`,
                    title: `Entrega: ${group.nombre_del_proyecto || group.nombre}`,
                    description: `Fecha límite del proyecto ${group.nombre}`,
                    event_date: group.fecha_limite,
                    event_type: 'milestone',
                    group_name: group.nombre,
                    group_id: group.identificacion
                });
            }
        });

        // Mostrar eventos
        displayAllEvents(events);
        
        // Actualizar calendario con los eventos
        displayMonthCalendar(currentYear, currentMonth);
    } catch (error) {
        console.error('Error en loadAllEvents:', error);
    }
}

function setupCalendarNavigation() {
    const prevBtn = document.querySelector('.nav-btn.prev');
    const nextBtn = document.querySelector('.nav-btn.next');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', navigateToPreviousMonth);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', navigateToNextMonth);
    }
}

function displayMonthCalendar(year, month) {
    currentYear = year;
    currentMonth = month;
    
    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Actualizar header
    const currentMonthElement = document.querySelector('.current-month');
    const currentMonthTitle = document.getElementById('currentMonthTitle');
    
    if (currentMonthElement) {
        currentMonthElement.textContent = `${monthNames[month]} ${year}`;
    }
    if (currentMonthTitle) {
        currentMonthTitle.textContent = `${monthNames[month]} ${year}`;
    }

    // Generar calendario
    generateCalendarGrid(year, month);
}

async function generateCalendarGrid(year, month) {
    const calendarGrid = document.querySelector('.calendar-grid');
    if (!calendarGrid) return;

    // Limpiar grid
    calendarGrid.innerHTML = '';

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    // Días vacíos al inicio
    for (let i = 0; i < startingDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDay);
    }

    // Obtener eventos para este mes
    const events = await getEventsForMonth(year, month);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;

        const dayDate = new Date(year, month, day);
        dayDate.setHours(0, 0, 0, 0);

        // Marcar día actual
        if (dayDate.getTime() === today.getTime()) {
            dayElement.classList.add('today');
        }

        // Marcar días con eventos
        const dayEvents = events.filter(event => {
            const eventDate = new Date(event.event_date);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate.getTime() === dayDate.getTime();
        });

        if (dayEvents.length > 0) {
            dayElement.classList.add('has-events');
            
            // Diferenciar eventos pasados vs futuros
            const hasPastEvents = dayEvents.some(event => {
                const eventDate = new Date(event.event_date);
                eventDate.setHours(0, 0, 0, 0);
                return eventDate < today;
            });
            
            const hasFutureEvents = dayEvents.some(event => {
                const eventDate = new Date(event.event_date);
                eventDate.setHours(0, 0, 0, 0);
                return eventDate >= today;
            });

            if (hasPastEvents) dayElement.classList.add('has-past-events');
            if (hasFutureEvents) dayElement.classList.add('has-future-events');

            const eventIndicator = document.createElement('div');
            eventIndicator.className = 'event-indicator';
            dayElement.appendChild(eventIndicator);
        }

        // Click en día
        dayElement.addEventListener('click', function() {
            showDayEvents(day, month, year);
        });

        calendarGrid.appendChild(dayElement);
    }

    // Días vacíos al final
    const totalCells = 42;
    const currentCells = calendarGrid.children.length;
    for (let i = currentCells; i < totalCells; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDay);
    }
}

async function getEventsForMonth(year, month) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return [];

    try {
        const currentUserId = currentUser.id;

        // Obtener grupos del usuario
        const { data: allGroups } = await supabase
            .from('grupos')
            .select('identificacion, nombre, nombre_del_proyecto, fecha_limite, miembros, creado_por');

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

        const userGroupIds = userGroups.map(g => g.identificacion);

        // Obtener tareas del mes
        const startDate = new Date(year, month, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

        let userTasks = [];
        if (userGroupIds.length > 0) {
            const { data: tasks } = await supabase
                .from('tareas')
                .select('id, titulo, descripcion, fecha_limite, proyecto_id, completada')
                .in('proyecto_id', userGroupIds)
                .gte('fecha_limite', startDate)
                .lte('fecha_limite', endDate);

            if (tasks) userTasks = tasks;
        }

        // Generar eventos
        const events = [];

        userTasks.forEach(task => {
            if (task.fecha_limite) {
                const group = userGroups.find(g => g.identificacion === task.proyecto_id);
                events.push({
                    id: `task-${task.id}`,
                    title: task.titulo,
                    description: task.descripcion || 'Sin descripción',
                    event_date: task.fecha_limite,
                    event_type: task.completada ? 'completed' : 'deadline',
                    group_name: group ? group.nombre : 'Sin grupo',
                    is_completed: task.completada
                });
            }
        });

        // Agregar eventos de grupos
        userGroups.forEach(group => {
            if (group.fecha_limite) {
                const groupDate = new Date(group.fecha_limite);
                if (groupDate.getMonth() === month && groupDate.getFullYear() === year) {
                    events.push({
                        id: `group-${group.identificacion}`,
                        title: `Entrega: ${group.nombre_del_proyecto || group.nombre}`,
                        description: `Fecha límite del proyecto ${group.nombre}`,
                        event_date: group.fecha_limite,
                        event_type: 'milestone',
                        group_name: group.nombre
                    });
                }
            }
        });

        return events;
    } catch (error) {
        console.error('Error obteniendo eventos:', error);
        return [];
    }
}

function navigateToPreviousMonth() {
    if (currentMonth === 0) {
        currentMonth = 11;
        currentYear--;
    } else {
        currentMonth--;
    }
    
    displayMonthCalendar(currentYear, currentMonth);
    loadAllEvents();
}

function navigateToNextMonth() {
    if (currentMonth === 11) {
        currentMonth = 0;
        currentYear++;
    } else {
        currentMonth++;
    }
    
    displayMonthCalendar(currentYear, currentMonth);
    loadAllEvents();
}

async function displayAllEvents(events) {
    const eventsList = document.querySelector('.events-list');
    if (!eventsList) return;

    eventsList.innerHTML = '';

    if (!events || events.length === 0) {
        eventsList.innerHTML = '<div class="no-events">No hay eventos registrados</div>';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Separar eventos pasados y futuros
    const pastEvents = events.filter(event => {
        const eventDate = new Date(event.event_date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate < today;
    }).sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

    const futureEvents = events.filter(event => {
        const eventDate = new Date(event.event_date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
    }).sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

    // Título para eventos futuros
    if (futureEvents.length > 0) {
        const futureHeader = document.createElement('div');
        futureHeader.className = 'events-section-header';
        futureHeader.innerHTML = '<h4>🔜 Próximos Eventos</h4>';
        eventsList.appendChild(futureHeader);

        futureEvents.forEach(event => {
            const eventElement = createEventElement(event, 'future');
            eventsList.appendChild(eventElement);
        });
    }

    // Título para eventos pasados
    if (pastEvents.length > 0) {
        const pastHeader = document.createElement('div');
        pastHeader.className = 'events-section-header past';
        pastHeader.innerHTML = '<h4>✅ Eventos Pasados</h4>';
        eventsList.appendChild(pastHeader);

        pastEvents.forEach(event => {
            const eventElement = createEventElement(event, 'past');
            eventsList.appendChild(eventElement);
        });
    }

    // Mensaje si no hay eventos
    if (pastEvents.length === 0 && futureEvents.length === 0) {
        eventsList.innerHTML = '<div class="no-events">No hay eventos registrados</div>';
    }
}

function createEventElement(event, type) {
    const eventDate = new Date(event.event_date);
    const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDay = new Date(event.event_date);
    eventDay.setHours(0, 0, 0, 0);
    
    const isPast = eventDay < today;
    const eventType = isPast ? 'past' : 'future';
    const isCompleted = event.is_completed || false;

    const eventItem = document.createElement('div');
    eventItem.className = `event-item event-${eventType}`;
    eventItem.innerHTML = `
        <div class="event-date event-date-${eventType}">
            <span class="event-day">${eventDate.getDate()}</span>
            <span class="event-month">${monthNames[eventDate.getMonth()]}</span>
        </div>
        <div class="event-info">
            <h4>${escapeHtml(event.title)}</h4>
            <p>${escapeHtml(event.description)}</p>
            <div class="event-meta">
                <small class="event-group">${escapeHtml(event.group_name)}</small>
                <small class="event-status">${isCompleted ? '✅ Completado' : (isPast ? '✅ Pasado' : '⏰ Pendiente')}</small>
            </div>
        </div>
    `;

    eventItem.addEventListener('click', function() {
        showEventDetails(event);
    });

    return eventItem;
}

async function showDayEvents(day, month, year) {
    const events = await getEventsForMonth(year, month);
    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(year, month, day);
    selectedDate.setHours(0, 0, 0, 0);

    const dayEvents = events.filter(event => {
        const eventDate = new Date(event.event_date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === selectedDate.getTime();
    });

    if (dayEvents.length > 0) {
        const pastEvents = dayEvents.filter(event => {
            const eventDate = new Date(event.event_date);
            return eventDate < today;
        });
        const futureEvents = dayEvents.filter(event => {
            const eventDate = new Date(event.event_date);
            return eventDate >= today;
        });

        let eventsText = '';
        
        if (futureEvents.length > 0) {
            eventsText += '🔜 Próximos:\n' + futureEvents.map(event => `• ${event.title}`).join('\n') + '\n\n';
        }
        
        if (pastEvents.length > 0) {
            eventsText += '✅ Completados:\n' + pastEvents.map(event => `• ${event.title}`).join('\n');
        }

        alert(`Eventos para el ${day} de ${monthNames[month]}:\n\n${eventsText}`);
    } else {
        alert(`No hay eventos para el ${day} de ${monthNames[month]}`);
    }
}

function showEventDetails(event) {
    const eventDate = new Date(event.event_date);
    const formattedDate = eventDate.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDay = new Date(event.event_date);
    eventDay.setHours(0, 0, 0, 0);
    const isPast = eventDay < today;
    const isCompleted = event.is_completed || false;

    const modalHTML = `
        <div class="event-modal">
            <div class="modal-content">
                <div class="modal-header ${isPast ? 'past-event' : 'future-event'}">
                    <h3>${escapeHtml(event.title)} ${isCompleted ? '✅' : (isPast ? '✅' : '⏰')}</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="event-detail">
                        <strong>Fecha:</strong> ${formattedDate}
                    </div>
                    <div class="event-detail">
                        <strong>Descripción:</strong> ${escapeHtml(event.description)}
                    </div>
                    <div class="event-detail">
                        <strong>Grupo:</strong> ${escapeHtml(event.group_name)}
                    </div>
                    <div class="event-detail">
                        <strong>Tipo:</strong> ${getEventTypeLabel(event.event_type)}
                    </div>
                    <div class="event-detail">
                        <strong>Estado:</strong> ${isCompleted ? '✅ Completado' : (isPast ? '✅ Pasado' : '⏰ Pendiente')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeEventModal()">Cerrar</button>
                    ${event.task_id ? `<button class="btn btn-primary" onclick="window.location.href='tareas.html?task=${event.task_id}'">Ver Tarea</button>` : ''}
                    ${event.group_id ? `<button class="btn btn-primary" onclick="window.location.href='grupos.html?group=${event.group_id}'">Ver Grupo</button>` : ''}
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const closeBtn = document.querySelector('.close-modal');
    const modal = document.querySelector('.event-modal');
    
    closeBtn.addEventListener('click', closeEventModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeEventModal();
        }
    });
}

function getEventTypeLabel(type) {
    const labels = {
        'deadline': 'Fecha Límite',
        'milestone': 'Hito del Proyecto',
        'meeting': 'Reunión',
        'completed': 'Completado'
    };
    return labels[type] || type;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function closeEventModal() {
    const modal = document.querySelector('.event-modal');
    if (modal) {
        modal.remove();
    }
}

// Hacer función global
window.closeEventModal = closeEventModal;

// CSS adicional
const calendarStyles = `
    .calendar-day {
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
    }
    .calendar-day:hover {
        background: #e3f2fd !important;
        transform: scale(1.05);
    }
    .calendar-day.today {
        background: #3498db !important;
        color: white;
        font-weight: bold;
    }
    .calendar-day.has-events {
        background: #fff3cd;
    }
    .calendar-day.has-past-events {
        background: #f8d7da;
    }
    .calendar-day.has-future-events {
        background: #d4edda;
    }
    .event-indicator {
        position: absolute;
        bottom: 5px;
        left: 50%;
        transform: translateX(-50%);
        width: 6px;
        height: 6px;
        background: #e74c3c;
        border-radius: 50%;
    }
    .calendar-day.has-past-events .event-indicator {
        background: #6c757d;
    }
    .calendar-day.has-future-events .event-indicator {
        background: #28a745;
    }
    
    /* Estilos para la lista de eventos */
    .events-section-header {
        margin: 1.5rem 0 0.5rem 0;
        padding: 0.5rem 0;
        border-bottom: 2px solid #3498db;
    }
    .events-section-header.past {
        border-bottom-color: #6c757d;
    }
    .events-section-header h4 {
        margin: 0;
        color: #2c3e50;
        font-size: 1.1rem;
    }
    
    .event-item {
        cursor: pointer;
        transition: all 0.3s ease;
        margin-bottom: 0.8rem;
        border-radius: 8px;
        border-left: 4px solid #3498db;
        display: flex;
        gap: 1rem;
        padding: 1rem;
        background: white;
    }
    .event-item.event-past {
        border-left-color: #6c757d;
        opacity: 0.8;
        background: #f8f9fa;
    }
    .event-item.event-future {
        border-left-color: #28a745;
        background: white;
    }
    .event-item:hover {
        transform: translateX(5px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .event-date {
        background: #3498db;
        color: white;
        padding: 0.8rem;
        border-radius: 8px;
        text-align: center;
        min-width: 60px;
        flex-shrink: 0;
    }
    .event-date-past {
        background: #6c757d !important;
    }
    .event-date-future {
        background: #28a745 !important;
    }
    .event-day {
        display: block;
        font-size: 1.5rem;
        font-weight: 700;
        line-height: 1;
    }
    .event-month {
        display: block;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .event-info {
        flex: 1;
    }
    
    .event-info h4 {
        margin: 0 0 0.5rem 0;
        color: #2c3e50;
    }
    
    .event-info p {
        margin: 0 0 0.5rem 0;
        color: #7f8c8d;
        font-size: 0.9rem;
    }
    
    .event-meta {
        display: flex;
        justify-content: space-between;
        margin-top: 0.5rem;
    }
    .event-group {
        color: #7f8c8d;
    }
    .event-status {
        font-weight: 600;
    }
    .event-past .event-status {
        color: #28a745;
    }
    .event-future .event-status {
        color: #ffc107;
    }
    
    /* Modal styles */
    .event-modal {
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
        backdrop-filter: blur(4px);
    }
    .event-modal .modal-content {
        background: white;
        border-radius: 12px;
        padding: 0;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid #ecf0f1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 12px 12px 0 0;
    }
    .modal-header.future-event {
        background: #d4edda;
    }
    .modal-header.past-event {
        background: #f8f9fa;
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
        border-radius: 50%;
        transition: all 0.3s ease;
    }
    .close-modal:hover {
        background: #f8f9fa;
        color: #e74c3c;
    }
    .modal-body {
        padding: 1.5rem;
    }
    .event-detail {
        margin-bottom: 1rem;
        padding: 0.8rem;
        background: #f8f9fa;
        border-radius: 6px;
        border-left: 4px solid #3498db;
    }
    .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid #ecf0f1;
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
    }
    .no-events {
        text-align: center;
        color: #7f8c8d;
        padding: 2rem;
        font-style: italic;
    }
    .btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
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
`;

// Injectar estilos
if (!document.querySelector('#calendar-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'calendar-styles';
    styleElement.textContent = calendarStyles;
    document.head.appendChild(styleElement);
}

console.log('Calendario.js cargado correctamente con Supabase');
