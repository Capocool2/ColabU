// Panel de Administración - ColabU
import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin panel initializing...');
    
    // Obtener usuario actual desde localStorage
    const currentUserStr = localStorage.getItem('currentUser');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    const userRole = currentUser?.role?.toLowerCase();
    
    if (!currentUser || (userRole !== 'admin' && userRole !== 'administrador')) {
        alert('Acceso denegado. Esta página es solo para administradores.');
        window.location.href = 'login.html';
        return;
    }

    loadAdminDashboard();
});

async function loadAdminDashboard() {
    await updateAdminStats();
    await loadUsersTable();
    await loadGroupsTable();
    await loadSystemReports();
}

async function updateAdminStats() {
    try {
        // Obtener usuarios desde Supabase
        const { data: users, error: usersError } = await supabase
            .from('usuarios')
            .select('rol');
        
        // Obtener grupos desde Supabase
        const { data: groups, error: groupsError } = await supabase
            .from('grupos')
            .select('identificacion');
        
        if (usersError) {
            console.error('Error cargando usuarios:', usersError);
        }
        if (groupsError) {
            console.error('Error cargando grupos:', groupsError);
        }
        
        const totalUsers = users?.length || 0;
        const teachers = users?.filter(u => u.rol === 'docente' || u.rol === 'Docente').length || 0;
        const students = users?.filter(u => u.rol === 'estudiante' || u.rol === 'Estudiante').length || 0;
        const totalGroups = groups?.length || 0;

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('totalTeachers').textContent = teachers;
        document.getElementById('totalStudents').textContent = students;
        document.getElementById('totalGroups').textContent = totalGroups;
    } catch (err) {
        console.error('Error en updateAdminStats:', err);
    }
}

async function loadUsersTable() {
    const container = document.getElementById('usersTableBody');
    
    if (!container) return;

    container.innerHTML = '<tr><td colspan="5" class="empty-state"><p>Cargando usuarios...</p></td></tr>';

    try {
        const { data: users, error } = await supabase
            .from('usuarios')
            .select('id, nombre, correo, rol, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error cargando usuarios:', error);
            container.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <p>Error al cargar usuarios: ${error.message}</p>
                    </td>
                </tr>
            `;
            return;
        }

        container.innerHTML = '';

        if (!users || users.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <p>No hay usuarios registrados</p>
                        <p>Usa el botón "Agregar Usuario" para crear el primero</p>
                    </td>
                </tr>
            `;
            return;
        }

        users.forEach(user => {
            const row = createUserTableRow(user);
            container.appendChild(row);
        });
    } catch (err) {
        console.error('Error en loadUsersTable:', err);
        container.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <p>Error al cargar usuarios</p>
                </td>
            </tr>
        `;
    }
}

function createUserTableRow(user) {
    const row = document.createElement('tr');
    const role = user.rol?.toLowerCase() || '';
    const roleDisplay = role === 'docente' ? 'Docente' : 
                        role === 'estudiante' ? 'Estudiante' : 
                        role === 'admin' ? 'Administrador' : 
                        user.rol || 'Usuario';
    
    row.innerHTML = `
        <td>
            <div style="display: flex; align-items: center; gap: 0.8rem;">
                <div class="user-avatar-small" style="width: 36px; height: 36px; background: #3498db; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.8rem;">
                    ${getUserInitials(user.nombre)}
                </div>
                <div>
                    <div style="font-weight: 600; color: #2c3e50;">${user.nombre}</div>
                    <div style="font-size: 0.8rem; color: #7f8c8d;">ID: ${user.id.substring(0, 8)}...</div>
                </div>
            </div>
        </td>
        <td>${user.correo}</td>
        <td>
            <span class="role-badge ${role}">
                ${roleDisplay}
            </span>
        </td>
        <td>
            <span class="status-badge active">
                Activo
            </span>
        </td>
        <td>
            <div class="action-buttons">
                <button class="btn btn-sm btn-outline" onclick="editUser('${user.id}')">
                    <span>✏️</span> Editar
                </button>
                <button class="btn btn-sm btn-danger" onclick="deactivateUser('${user.id}')">
                    <span>🚫</span> Baja
                </button>
            </div>
        </td>
    `;

    return row;
}

async function loadGroupsTable() {
    const container = document.getElementById('groupsTableBody');
    
    if (!container) return;

    container.innerHTML = '<tr><td colspan="6" class="empty-state"><p>Cargando grupos...</p></td></tr>';

    try {
        // Obtener grupos desde Supabase
        const { data: groups, error: groupsError } = await supabase
            .from('grupos')
            .select('identificacion, nombre, nombre_del_proyecto, descripcion, fecha_limite, creado_por, creado_en, progreso, miembros')
            .order('creado_en', { ascending: false });

        if (groupsError) {
            console.error('Error cargando grupos:', groupsError);
            container.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <p>Error al cargar grupos: ${groupsError.message}</p>
                    </td>
                </tr>
            `;
            return;
        }

        container.innerHTML = '';

        if (!groups || groups.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <p>No hay grupos activos</p>
                        <p>Usa el botón "Crear Grupo" para crear el primero</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Obtener información de los creadores
        const creatorIds = groups.map(g => g.creado_por).filter(Boolean);
        let creatorsMap = {};
        
        if (creatorIds.length > 0) {
            const { data: creators } = await supabase
                .from('usuarios')
                .select('id, nombre')
                .in('id', creatorIds);
            
            if (creators) {
                creatorsMap = creators.reduce((acc, creator) => {
                    acc[creator.id] = creator.nombre;
                    return acc;
                }, {});
            }
        }

        // Crear filas para cada grupo
        groups.forEach(group => {
            const row = createGroupTableRow(group, creatorsMap);
            container.appendChild(row);
        });
    } catch (err) {
        console.error('Error en loadGroupsTable:', err);
        container.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <p>Error al cargar grupos</p>
                </td>
            </tr>
        `;
    }
}

function createGroupTableRow(group, creatorsMap) {
    const row = document.createElement('tr');
    
    // Obtener nombre del creador
    const creatorName = creatorsMap[group.creado_por] || 'Usuario desconocido';
    
    // Procesar miembros (jsonb)
    const miembros = Array.isArray(group.miembros) ? group.miembros : [];
    const miembrosCount = miembros.length;
    
    // Calcular progreso
    const progreso = group.progreso ? parseFloat(group.progreso) : 0;
    
    row.innerHTML = `
        <td>
            <div style="font-weight: 600; color: #2c3e50;">${group.nombre || 'Sin nombre'}</div>
            <div style="font-size: 0.8rem; color: #7f8c8d;">ID: ${group.identificacion.substring(0, 8)}...</div>
        </td>
        <td>${group.nombre_del_proyecto || 'Sin proyecto'}</td>
        <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div style="width: 32px; height: 32px; background: #3498db; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.7rem;">
                    ${getUserInitials(creatorName)}
                </div>
                <span>${creatorName}</span>
            </div>
        </td>
        <td>
            <span style="font-weight: 600; color: #3498db;">${miembrosCount} ${miembrosCount === 1 ? 'miembro' : 'miembros'}</span>
        </td>
        <td>
            <div class="progress-display">
                <div class="progress-bar-small">
                    <div class="progress-fill" style="width: ${progreso}%"></div>
                </div>
                <span style="font-weight: 600; min-width: 40px;">${progreso}%</span>
            </div>
        </td>
        <td>
            <div class="action-buttons">
                <button class="btn btn-sm btn-outline" onclick="viewGroup('${group.identificacion}')">
                    <span>👁️</span> Ver
                </button>
                <button class="btn btn-sm btn-warning" onclick="editGroup('${group.identificacion}')">
                    <span>✏️</span> Editar
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteGroup('${group.identificacion}')">
                    <span>🗑️</span> Eliminar
                </button>
            </div>
        </td>
    `;

    return row;
}

async function loadSystemReports() {
    await loadRecentActivity();
    await loadUsageStats();
}

async function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container) return;

    container.innerHTML = '<div class="activity-item"><div class="activity-content"><p>Cargando actividad...</p></div></div>';

    try {
        const activities = [];

        // Obtener usuarios recientes (últimos 5)
        const { data: recentUsers, error: usersError } = await supabase
            .from('usuarios')
            .select('nombre, created_at, rol')
            .order('created_at', { ascending: false })
            .limit(3);

        if (!usersError && recentUsers) {
            recentUsers.forEach(user => {
                const timeAgo = getTimeAgo(user.created_at);
                const roleIcon = user.rol === 'docente' ? '🎓' : user.rol === 'admin' ? '👑' : '👤';
                activities.push({
                    icon: roleIcon,
                    text: `Nuevo usuario registrado: ${user.nombre}`,
                    time: timeAgo,
                    timestamp: new Date(user.created_at).getTime()
                });
            });
        }

        // Obtener grupos recientes (últimos 3)
        const { data: recentGroups, error: groupsError } = await supabase
            .from('grupos')
            .select('nombre, nombre_del_proyecto, creado_en, creado_por')
            .order('creado_en', { ascending: false })
            .limit(3);

        if (!groupsError && recentGroups) {
            // Obtener nombres de los creadores
            const creatorIds = recentGroups.map(g => g.creado_por).filter(Boolean);
            let creatorsMap = {};
            
            if (creatorIds.length > 0) {
                const { data: creators } = await supabase
                    .from('usuarios')
                    .select('id, nombre')
                    .in('id', creatorIds);
                
                if (creators) {
                    creatorsMap = creators.reduce((acc, creator) => {
                        acc[creator.id] = creator.nombre;
                        return acc;
                    }, {});
                }
            }

            recentGroups.forEach(group => {
                const timeAgo = getTimeAgo(group.creado_en);
                const creatorName = creatorsMap[group.creado_por] || 'Usuario';
                activities.push({
                    icon: '🔧',
                    text: `${creatorName} creó el grupo "${group.nombre}"`,
                    time: timeAgo,
                    timestamp: new Date(group.creado_en).getTime()
                });
            });
        }

        // Ordenar actividades por timestamp (más recientes primero)
        activities.sort((a, b) => b.timestamp - a.timestamp);
        
        // Limitar a las 5 más recientes
        const recentActivities = activities.slice(0, 5);

        if (recentActivities.length === 0) {
            container.innerHTML = `
                <div class="activity-item">
                    <div class="activity-content">
                        <p>No hay actividad reciente</p>
                        <span>Las actividades aparecerán aquí</span>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = recentActivities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">${activity.icon}</div>
                <div class="activity-content">
                    <p>${activity.text}</p>
                    <span>${activity.time}</span>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error cargando actividad reciente:', err);
        container.innerHTML = `
            <div class="activity-item">
                <div class="activity-content">
                    <p>Error al cargar actividad</p>
                    <span>Intenta recargar la página</span>
                </div>
            </div>
        `;
    }
}

async function loadUsageStats() {
    const container = document.getElementById('usageStats');
    if (!container) return;

    container.innerHTML = '<div class="usage-item"><span class="usage-label">Cargando...</span><span class="usage-value">-</span></div>';

    try {
        // Obtener usuarios activos desde Supabase
        const { data: users, error: usersError } = await supabase
            .from('usuarios')
            .select('id, created_at');

        const activeUsers = users?.length || 0;

        // Obtener grupos activos desde Supabase
        const { data: groups, error: groupsError } = await supabase
            .from('grupos')
            .select('identificacion');

        const activeGroups = groups?.length || 0;

        // Obtener tareas completadas desde localStorage
        const tasks = JSON.parse(localStorage.getItem('colabu_tasks') || '[]');
        const completedTasks = tasks.filter(task => task.completed === true).length;

        // Calcular actividad de hoy (usuarios y grupos creados hoy)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const usersToday = users?.filter(user => {
            const userDate = new Date(user.created_at);
            userDate.setHours(0, 0, 0, 0);
            return userDate.getTime() === today.getTime();
        }).length || 0;

        const groupsToday = groups?.filter(group => {
            if (!group.creado_en) return false;
            const groupDate = new Date(group.creado_en);
            groupDate.setHours(0, 0, 0, 0);
            return groupDate.getTime() === today.getTime();
        }).length || 0;

        const activityToday = usersToday + groupsToday;

        const stats = [
            { label: 'Usuarios activos', value: activeUsers },
            { label: 'Grupos activos', value: activeGroups },
            { label: 'Tareas completadas', value: completedTasks },
            { label: 'Actividad hoy', value: activityToday }
        ];

        container.innerHTML = stats.map(stat => `
            <div class="usage-item">
                <span class="usage-label">${stat.label}</span>
                <span class="usage-value">${stat.value}</span>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error cargando estadísticas:', err);
        container.innerHTML = `
            <div class="usage-item">
                <span class="usage-label">Error</span>
                <span class="usage-value">-</span>
            </div>
        `;
    }
}

// Función auxiliar para calcular tiempo transcurrido
function getTimeAgo(dateString) {
    if (!dateString) return 'Fecha desconocida';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return 'Hace unos momentos';
    if (diffMins < 60) return `Hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
    if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    if (diffDays < 7) return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
    if (diffWeeks < 4) return `Hace ${diffWeeks} ${diffWeeks === 1 ? 'semana' : 'semanas'}`;
    if (diffMonths < 12) return `Hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
    return `Hace más de ${Math.floor(diffDays / 365)} ${Math.floor(diffDays / 365) === 1 ? 'año' : 'años'}`;
}

function showAddUserModal() {
    const modalHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>➕ Agregar Nuevo Usuario</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="addUserForm" onsubmit="event.preventDefault(); addNewUser();">
                        <div class="form-group">
                            <label for="newUserName">Nombre Completo *</label>
                            <input type="text" id="newUserName" required placeholder="Ej: Juan Pérez García" autocomplete="name">
                        </div>
                        <div class="form-group">
                            <label for="newUserEmail">Email Institucional *</label>
                            <input type="email" id="newUserEmail" required placeholder="usuario@universidad.edu" autocomplete="email">
                        </div>
                        <div class="form-group">
                            <label for="newUserRole">Rol *</label>
                            <select id="newUserRole" required>
                                <option value="">Seleccionar rol...</option>
                                <option value="estudiante">Estudiante</option>
                                <option value="docente">Docente</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="newUserPassword">Contraseña Temporal *</label>
                            <input type="password" id="newUserPassword" required placeholder="Mínimo 6 caracteres" autocomplete="new-password">
                            <small style="color: #7f8c8d; font-size: 0.8rem;">El usuario podrá cambiar su contraseña después</small>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" form="addUserForm" class="btn btn-primary">Crear Usuario</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setupModalEvents();
    
    // Enfocar el primer campo
    setTimeout(() => {
        const firstInput = document.getElementById('newUserName');
        if (firstInput) firstInput.focus();
    }, 100);
}

async function showCreateGroupModal() {
    // Obtener docentes desde Supabase
    const { data: teachers, error } = await supabase
        .from('usuarios')
        .select('id, nombre, correo, rol')
        .or('rol.eq.docente,rol.eq.Docente')
        .order('nombre', { ascending: true });

    if (error) {
        console.error('Error cargando docentes:', error);
        showAlert('Error al cargar la lista de docentes', 'error');
        return;
    }

    const teachersList = teachers || [];

    const modalHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>➕ Crear Nuevo Grupo</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="createGroupForm">
                        <div class="form-group">
                            <label for="groupName">Nombre del Grupo *</label>
                            <input type="text" id="groupName" required placeholder="Ej: Equipo Desarrollo Web">
                        </div>
                        <div class="form-group">
                            <label for="projectName">Nombre del Proyecto *</label>
                            <input type="text" id="projectName" required placeholder="Ej: Sistema de Gestión Académica">
                        </div>
                        <div class="form-group">
                            <label for="groupDescription">Descripción del Proyecto</label>
                            <textarea id="groupDescription" rows="3" placeholder="Describe los objetivos y alcance del proyecto..."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="groupLeader">Líder del Grupo *</label>
                            <select id="groupLeader" required>
                                <option value="">Seleccionar docente...</option>
                                ${teachersList.map(teacher => `
                                    <option value="${teacher.id}">${teacher.nombre} - ${teacher.correo}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="groupDeadline">Fecha de Entrega Objetivo</label>
                            <input type="date" id="groupDeadline">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="createNewGroup()">Crear Grupo</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setupModalEvents();
}

async function addNewUser() {
    const name = document.getElementById('newUserName')?.value.trim();
    const email = document.getElementById('newUserEmail')?.value.trim();
    const role = document.getElementById('newUserRole')?.value;
    const password = document.getElementById('newUserPassword')?.value;

    if (!name || !email || !role || !password) {
        showAlert('Por favor completa todos los campos obligatorios', 'error');
        return;
    }

    if (password.length < 6) {
        showAlert('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('Por favor ingresa un email válido', 'error');
        return;
    }

    try {
        // Verificar si el email ya existe en la base de datos
        const { data: existingUser, error: checkError } = await supabase
            .from('usuarios')
            .select('correo')
            .eq('correo', email)
            .maybeSingle(); // Usar maybeSingle en lugar de single para no fallar si no existe

        // Si existe un usuario con ese email, mostrar error
        if (existingUser && !checkError) {
            showAlert('Este email ya está registrado en el sistema', 'error');
            return;
        }
        
        // Si hay un error que no sea "no encontrado", informar
        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error verificando email:', checkError);
            // Continuar de todas formas, ya que puede ser un error de conexión
        }

        // Normalizar el rol para que coincida con los valores de la base de datos
        let normalizedRole = role;
        // Ya estamos usando los valores correctos en el select, pero por si acaso:
        if (role === 'teacher') normalizedRole = 'docente';
        if (role === 'student') normalizedRole = 'estudiante';
        if (role === 'admin') normalizedRole = 'admin';
        // Si el valor ya es correcto (docente, estudiante, admin), mantenerlo

        // Mostrar indicador de carga
        const submitBtn = document.querySelector('.modal-footer .btn-primary[form="addUserForm"]');
        const originalText = submitBtn?.textContent || 'Crear Usuario';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creando usuario...';
        }

        // 1. Crear usuario en Supabase Auth
        // Nota: signUp puede requerir confirmación de email dependiendo de la configuración de Supabase
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { 
                    full_name: name, 
                    role: normalizedRole 
                },
                emailRedirectTo: undefined // No redirigir después de confirmar email
            }
        });

        if (authError) {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
            showAlert('Error al crear usuario: ' + authError.message, 'error');
            return;
        }

        const user = authData.user;
        if (!user) {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
            showAlert('Error: No se pudo crear el usuario. Verifica la configuración de Supabase.', 'error');
            return;
        }

        // 2. Insertar en tabla "usuarios"
        const { error: userError } = await supabase
            .from("usuarios")
            .insert([
                {
                    id: user.id,
                    nombre: name,
                    correo: email,
                    rol: normalizedRole
                }
            ]);

        if (userError) {
            console.error("Error insertando en 'usuarios':", userError.message);
            // Si falla la inserción en usuarios, intentamos continuar con perfiles
            // pero informamos del error
            if (userError.code !== '23505') { // 23505 es "unique_violation" - email duplicado
                showAlert('Usuario creado en Auth pero error al guardar en usuarios: ' + userError.message, 'error');
            }
        }

        // 3. Insertar también en tabla "perfiles"
        const { error: perfilError } = await supabase
            .from("perfiles")
            .insert([
                {
                    identificacion: user.id,
                    nombre: name,
                    role: normalizedRole
                }
            ]);

        if (perfilError) {
            console.error("Error insertando en 'perfiles':", perfilError.message);
            // Si falla perfiles pero usuarios se creó, informamos pero no es crítico
            if (perfilError.code !== '23505') {
                showAlert('Usuario creado pero hubo un problema al guardar el perfil: ' + perfilError.message, 'error');
            }
        }

        // Restaurar botón
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }

        showAlert(`✅ Usuario "${name}" creado exitosamente`, 'success');
        
        // Limpiar el formulario
        const form = document.getElementById('addUserForm');
        if (form) {
            form.reset();
        }
        
        closeModal();
        
        // Recargar la tabla de usuarios y estadísticas
        await loadUsersTable();
        await updateAdminStats();
    } catch (err) {
        console.error("Error general:", err);
        showAlert('Ocurrió un error inesperado: ' + err.message, 'error');
        
        // Restaurar botón en caso de error
        const submitBtn = document.querySelector('.modal-footer .btn-primary[form="addUserForm"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crear Usuario';
        }
    }
}

async function createNewGroup() {
    const name = document.getElementById('groupName')?.value.trim();
    const projectName = document.getElementById('projectName')?.value.trim();
    const description = document.getElementById('groupDescription')?.value.trim();
    const leaderId = document.getElementById('groupLeader')?.value;
    const deadline = document.getElementById('groupDeadline')?.value;

    if (!name || !projectName || !leaderId) {
        showAlert('Por favor completa los campos obligatorios', 'error');
        return;
    }

    // Verificar que el líder existe en Supabase
    const { data: leaderUser, error: leaderError } = await supabase
        .from('usuarios')
        .select('id, nombre')
        .eq('id', leaderId)
        .maybeSingle();
    
    if (leaderError || !leaderUser) {
        showAlert('El docente seleccionado no existe', 'error');
        return;
    }

    // Obtener usuario actual para creado_por
    const currentUserStr = localStorage.getItem('currentUser');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    const creadoPor = currentUser?.id || leaderId;

    try {
        // Crear grupo en Supabase
        const { data: newGroup, error: groupError } = await supabase
            .from('grupos')
            .insert([
                {
                    nombre: name,
                    nombre_del_proyecto: projectName,
                    descripcion: description || null,
                    fecha_limite: deadline || null,
                    creado_por: creadoPor,
                    progreso: 0,
                    miembros: [
                        {
                            user_id: leaderId,
                            nombre: leaderUser.nombre,
                            role: 'Líder de proyecto'
                        }
                    ]
                }
            ])
            .select()
            .single();

        if (groupError) {
            console.error('Error creando grupo:', groupError);
            showAlert('Error al crear el grupo: ' + groupError.message, 'error');
            return;
        }

        showAlert(`Grupo "${name}" creado exitosamente`, 'success');
        closeModal();
        await loadGroupsTable();
        await updateAdminStats();
    } catch (err) {
        console.error('Error en createNewGroup:', err);
        showAlert('Ocurrió un error inesperado al crear el grupo', 'error');
    }
}

function deactivateUser(userId) {
    if (!confirm('¿Estás seguro de que quieres dar de baja a este usuario? El usuario no podrá acceder al sistema.')) {
        return;
    }

    const users = JSON.parse(localStorage.getItem('colabu_users') || '[]');
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
        users[userIndex].active = false;
        users[userIndex].deactivated_at = new Date().toISOString();
        users[userIndex].deactivated_by = 'admin';
        localStorage.setItem('colabu_users', JSON.stringify(users));
        
        showAlert('Usuario dado de baja exitosamente', 'success');
        loadUsersTable();
        updateAdminStats();
    }
}

async function deleteGroup(groupId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este grupo? Esta acción no se puede deshacer y se perderán todos los datos del grupo.')) {
        return;
    }

    try {
        // Eliminar grupo de Supabase
        const { error } = await supabase
            .from('grupos')
            .delete()
            .eq('identificacion', groupId);

        if (error) {
            console.error('Error eliminando grupo:', error);
            showAlert('Error al eliminar el grupo: ' + error.message, 'error');
            return;
        }

        showAlert('Grupo eliminado exitosamente', 'success');
        await loadGroupsTable();
        await updateAdminStats();
    } catch (err) {
        console.error('Error en deleteGroup:', err);
        showAlert('Ocurrió un error inesperado al eliminar el grupo', 'error');
    }
}

function editUser(userId) {
    showAlert('Funcionalidad de edición en desarrollo', 'info');
}

function viewGroup(groupId) {
    showAlert('Funcionalidad de vista de grupo en desarrollo. ID: ' + groupId.substring(0, 8) + '...', 'info');
}

function editGroup(groupId) {
    showAlert('Funcionalidad de edición de grupo en desarrollo. ID: ' + groupId.substring(0, 8) + '...', 'info');
}

// Funciones auxiliares
function getUserInitials(name) {
    if (!name) return 'US';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function setupModalEvents() {
    const closeBtn = document.querySelector('.close-modal');
    const overlay = document.querySelector('.modal-overlay');
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
}

function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#fff3cd'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#856404'};
        padding: 15px 20px;
        border-radius: 8px;
        border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#ffeaa7'};
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    alert.textContent = message;
    document.body.appendChild(alert);

    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 3000);
}

// Hacer funciones globales
window.showAddUserModal = showAddUserModal;
window.showCreateGroupModal = showCreateGroupModal;
window.addNewUser = addNewUser;
window.createNewGroup = createNewGroup;
window.deactivateUser = deactivateUser;
window.deleteGroup = deleteGroup;
window.closeModal = closeModal;
window.editUser = editUser;
window.viewGroup = viewGroup;
window.editGroup = editGroup;

console.log('Admin panel loaded successfully');