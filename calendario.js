// Calendario de Proyectos - ColabU (Versión independiente)
document.addEventListener('DOMContentLoaded', function() {
    console.log('Calendario inicializando...');
    initializeCalendar();
});

function initializeCalendar() {
 // Verificar autenticación al inicio de cada archivo JS principal
document.addEventListener('DOMContentLoaded', function() {
    // Verificar que el usuario esté logueado
    if (!localStorage.getItem('currentUser')) {
        alert('Por favor inicia sesión primero');
        window.location.href = 'login.html';
        return;
    }
    
    // Tu código existente aquí...
    initializeTuFuncion();
});
    // Inicializar datos demo si no existen
    initDemoEvents();
    
    // Configurar calendario
    setupCalendarNavigation();
    loadCurrentMonthCalendar();
    loadAllEvents(); // Cambiado a cargar todos los eventos
    
    console.log('Calendario listo!');
}

function isUserLoggedIn() {
    return localStorage.getItem('currentUser') !== null;
}

function initDemoEvents() {
    if (!localStorage.getItem('colabu_events')) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);

        const demoEvents = [
            // Eventos pasados
            {
                id: 1,
                title: 'Reunión Inicial',
                description: 'Kick-off del proyecto',
                event_date: lastWeek.toISOString().split('T')[0],
                event_type: 'meeting',
                group_name: 'Equipo Alpha'
            },
            {
                id: 2,
                title: 'Investigación de Mercado',
                description: 'Análisis de competencia',
                event_date: yesterday.toISOString().split('T')[0],
                event_type: 'milestone',
                group_name: 'Equipo Beta'
            },
            // Eventos futuros
            {
                id: 3,
                title: 'Entrega: Planificación',
                description: 'Prototipo de API - mama linda',
                event_date: '2025-09-22',
                event_type: 'deadline',
                group_name: 'Planificación'
            },
            {
                id: 4,
                title: 'Entrega: App Movilidad',
                description: 'Equipo Beta',
                event_date: '2024-11-29',
                event_type: 'deadline',
                group_name: 'Equipo Beta'
            },
            {
                id: 5,
                title: 'Entrega: Sistema Biblioteca',
                description: 'Equipo Alpha',
                event_date: '2024-12-14',
                event_type: 'deadline',
                group_name: 'Equipo Alpha'
            },
            {
                id: 6,
                title: 'Reunión de Progreso',
                description: 'Revisión semanal de avances',
                event_date: nextWeek.toISOString().split('T')[0],
                event_type: 'meeting',
                group_name: 'Equipo Alpha'
            },
            {
                id: 7,
                title: 'Presentación Final',
                description: 'Demo del proyecto completo',
                event_date: nextMonth.toISOString().split('T')[0],
                event_type: 'milestone',
                group_name: 'Todos los equipos'
            }
        ];
        localStorage.setItem('colabu_events', JSON.stringify(demoEvents));
    }
}

function getEvents() {
    const events = localStorage.getItem('colabu_events');
    return events ? JSON.parse(events) : [];
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

function loadCurrentMonthCalendar() {
    const now = new Date();
    displayMonthCalendar(now.getFullYear(), now.getMonth());
}

function displayMonthCalendar(year, month) {
    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Actualizar header
    const currentMonthElement = document.querySelector('.current-month');
    if (currentMonthElement) {
        currentMonthElement.textContent = `${monthNames[month]} ${year}`;
    }

    // Generar calendario
    generateCalendarGrid(year, month);
}

function generateCalendarGrid(year, month) {
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

    // Días del mes
    const today = new Date();
    const events = getEvents();

    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;

        // Marcar día actual
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayElement.classList.add('today');
        }

        // Marcar días con eventos
        const dayEvents = events.filter(event => {
            const eventDate = new Date(event.event_date);
            return eventDate.getDate() === day && 
                   eventDate.getMonth() === month && 
                   eventDate.getFullYear() === year;
        });

        if (dayEvents.length > 0) {
            dayElement.classList.add('has-events');
            
            // Diferenciar eventos pasados vs futuros
            const hasPastEvents = dayEvents.some(event => {
                const eventDate = new Date(event.event_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return eventDate < today;
            });
            
            const hasFutureEvents = dayEvents.some(event => {
                const eventDate = new Date(event.event_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
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

function navigateToPreviousMonth() {
    const currentMonthText = document.querySelector('.current-month').textContent;
    const [monthName, year] = currentMonthText.split(' ');
    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    let monthIndex = monthNames.indexOf(monthName);
    let yearNumber = parseInt(year);
    
    if (monthIndex === 0) {
        monthIndex = 11;
        yearNumber--;
    } else {
        monthIndex--;
    }
    
    displayMonthCalendar(yearNumber, monthIndex);
    loadAllEvents();
}

function navigateToNextMonth() {
    const currentMonthText = document.querySelector('.current-month').textContent;
    const [monthName, year] = currentMonthText.split(' ');
    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    let monthIndex = monthNames.indexOf(monthName);
    let yearNumber = parseInt(year);
    
    if (monthIndex === 11) {
        monthIndex = 0;
        yearNumber++;
    } else {
        monthIndex++;
    }
    
    displayMonthCalendar(yearNumber, monthIndex);
    loadAllEvents();
}

function loadAllEvents() {
    const events = getEvents();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Separar eventos pasados y futuros
    const pastEvents = events.filter(event => {
        const eventDate = new Date(event.event_date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate < today;
    }).sort((a, b) => new Date(b.event_date) - new Date(a.event_date)); // Más recientes primero

    const futureEvents = events.filter(event => {
        const eventDate = new Date(event.event_date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
    }).sort((a, b) => new Date(a.event_date) - new Date(b.event_date)); // Más próximos primero

    displayAllEvents(pastEvents, futureEvents);
}

function displayAllEvents(pastEvents, futureEvents) {
    const eventsList = document.querySelector('.events-list');
    if (!eventsList) return;

    eventsList.innerHTML = '';

    // Título para eventos futuros
    if (futureEvents.length > 0) {
        const futureHeader = document.createElement('div');
        futureHeader.className = 'events-section-header';
        futureHeader.innerHTML = '<h4> Próximos Eventos</h4>';
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

    const eventItem = document.createElement('div');
    eventItem.className = `event-item event-${eventType}`;
    eventItem.innerHTML = `
        <div class="event-date event-date-${eventType}">
            <span class="event-day">${eventDate.getDate()}</span>
            <span class="event-month">${monthNames[eventDate.getMonth()]}</span>
        </div>
        <div class="event-info">
            <h4>${event.title}</h4>
            <p>${event.description}</p>
            <div class="event-meta">
                <small class="event-group">${event.group_name}</small>
                <small class="event-status">${isPast ? '✅ Completado' : '⏰ Pendiente'}</small>
            </div>
        </div>
    `;

    eventItem.addEventListener('click', function() {
        showEventDetails(event);
    });

    return eventItem;
}

function showDayEvents(day, month, year) {
    const events = getEvents();
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

    const modalHTML = `
        <div class="event-modal">
            <div class="modal-content">
                <div class="modal-header ${isPast ? 'past-event' : 'future-event'}">
                    <h3>${event.title} ${isPast ? '✅' : '⏰'}</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="event-detail">
                        <strong>Fecha:</strong> ${formattedDate}
                    </div>
                    <div class="event-detail">
                        <strong>Descripción:</strong> ${event.description}
                    </div>
                    <div class="event-detail">
                        <strong>Grupo:</strong> ${event.group_name}
                    </div>
                    <div class="event-detail">
                        <strong>Tipo:</strong> ${event.event_type}
                    </div>
                    <div class="event-detail">
                        <strong>Estado:</strong> ${isPast ? '✅ Completado' : '⏰ Pendiente'}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeEventModal()">Cerrar</button>
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

function closeEventModal() {
    const modal = document.querySelector('.event-modal');
    if (modal) {
        modal.remove();
    }
}

// Hacer función global
window.closeEventModal = closeEventModal;




// Agregar CSS dinámico
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
    }
    
    .event-date {
        background: #3498db;
        color: white;
        padding: 0.8rem;
        border-radius: 8px;
        text-align: center;
        min-width: 60px;
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
`;

// Injectar estilos
if (!document.querySelector('#calendar-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'calendar-styles';
    styleElement.textContent = calendarStyles;
    document.head.appendChild(styleElement);
}