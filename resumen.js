// Resumen General - ColabU con Supabase
import { supabase } from './supabaseClient.js';

// Variables para almacenar suscripciones de Realtime
let resumenGroupsSubscription = null;
let resumenTasksSubscription = null;

document.addEventListener("DOMContentLoaded", function () {
  loadDashboardData();
  setupResumenRealtimeSubscriptions();
});

async function loadDashboardData() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) {
    console.warn("No hay usuario autenticado");
    return;
  }

  // Cargar datos actualizados desde Supabase
  await updateDashboardStats();
  await loadGroupProgress();
  await loadRecentTasks();
  await loadRecentActivity();
}

// Configurar suscripciones en tiempo real para resumen
function setupResumenRealtimeSubscriptions() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) return;

  // Cancelar suscripciones anteriores si existen
  if (resumenGroupsSubscription) {
    supabase.removeChannel(resumenGroupsSubscription);
  }
  if (resumenTasksSubscription) {
    supabase.removeChannel(resumenTasksSubscription);
  }

  // Suscribirse a cambios en grupos
  resumenGroupsSubscription = supabase
    .channel('grupos-for-resumen-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'grupos'
      },
      (payload) => {
        console.log('Cambio en grupos (resumen) detectado:', payload);
        // Recargar datos del dashboard
        loadDashboardData();
      }
    )
    .subscribe((status) => {
      console.log('Estado de suscripción grupos (resumen):', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Suscripción a grupos (resumen) activa');
      }
    });

  // Suscribirse a cambios en tareas
  resumenTasksSubscription = supabase
    .channel('tareas-for-resumen-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tareas'
      },
      (payload) => {
        console.log('Cambio en tareas (resumen) detectado:', payload);
        // Recargar datos del dashboard
        loadDashboardData();
      }
    )
    .subscribe((status) => {
      console.log('Estado de suscripción tareas (resumen):', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Suscripción a tareas (resumen) activa');
      }
    });
}

// Limpiar suscripciones al salir de la página
window.addEventListener('beforeunload', () => {
  if (resumenGroupsSubscription) {
    supabase.removeChannel(resumenGroupsSubscription);
  }
  if (resumenTasksSubscription) {
    supabase.removeChannel(resumenTasksSubscription);
  }
});

async function updateDashboardStats() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) return;

  try {
    const currentUserId = currentUser.id;

    // Obtener todos los grupos desde Supabase
    const { data: allGroups, error: groupsError } = await supabase
      .from('grupos')
      .select('identificacion, miembros, creado_por, progreso');

    if (groupsError) {
      console.error('Error cargando grupos:', groupsError);
      return;
    }

    // Filtrar grupos donde el usuario es miembro o creador
    const userGroups = (allGroups || []).filter(group => {
      // Si es el creador
      if (group.creado_por === currentUserId) return true;
      
      // Si está en el array de miembros (jsonb)
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

    // Calcular estadísticas
    const totalGroups = userGroups.length;

    // Obtener IDs de grupos del usuario
    const userGroupIds = userGroups.map(g => g.identificacion);

    // Obtener tareas completadas de los grupos del usuario
    let completedTasks = 0;
    if (userGroupIds.length > 0) {
      const { data: tasks, error: tasksError } = await supabase
        .from('tareas')
        .select('id, completada, proyecto_id')
        .in('proyecto_id', userGroupIds)
        .eq('completada', true);

      if (!tasksError && tasks) {
        completedTasks = tasks.length;
      }
    }

    // Calcular total de colaboradores únicos en todos los grupos
    const allCollaborators = new Set();
    userGroups.forEach((group) => {
      // Agregar creador
      if (group.creado_por) {
        allCollaborators.add(group.creado_por);
      }
      // Agregar miembros
      if (group.miembros && Array.isArray(group.miembros)) {
        group.miembros.forEach((member) => {
          if (typeof member === 'object' && member.user_id) {
            allCollaborators.add(member.user_id);
          } else if (typeof member === 'string') {
            allCollaborators.add(member);
          }
        });
      }
    });
    const totalCollaborators = allCollaborators.size;

    // Progreso promedio de todos los grupos
    const averageProgress =
      userGroups.length > 0
        ? Math.round(
            userGroups.reduce((sum, group) => sum + (parseFloat(group.progreso) || 0), 0) /
              userGroups.length
          )
        : 0;

    // Actualizar UI usando los IDs del HTML
    const gruposActivosEl = document.getElementById("grupos-activos");
    const tareasCompletadasEl = document.getElementById("tareas-completadas");
    const progresoGeneralEl = document.getElementById("progreso-general");
    const colaboradoresEl = document.getElementById("colaboradores");

    if (gruposActivosEl) gruposActivosEl.textContent = totalGroups;
    if (tareasCompletadasEl) tareasCompletadasEl.textContent = completedTasks;
    if (progresoGeneralEl) progresoGeneralEl.textContent = averageProgress + "%";
    if (colaboradoresEl) colaboradoresEl.textContent = totalCollaborators;
  } catch (error) {
    console.error('Error en updateDashboardStats:', error);
  }
}

async function loadGroupProgress() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) return;

  try {
    const currentUserId = currentUser.id;

    // Obtener todos los grupos desde Supabase
    const { data: allGroups, error: groupsError } = await supabase
      .from('grupos')
      .select('identificacion, nombre, nombre_del_proyecto, miembros, creado_por, progreso, creado_en')
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

    const progressList = document.getElementById("progreso-grupos");
    if (!progressList) return;

    progressList.innerHTML = "";

    if (userGroups.length === 0) {
      progressList.innerHTML = `
            <div class="empty-state">
                <p>No tienes grupos activos</p>
                <p>Crea tu primer grupo para empezar a colaborar</p>
            </div>
        `;
      return;
    }

    userGroups.forEach((group) => {
      const progressElement = createProgressElement(group);
      progressList.appendChild(progressElement);
    });
  } catch (error) {
    console.error('Error en loadGroupProgress:', error);
  }
}

function createProgressElement(group) {
  const progressItem = document.createElement("div");
  progressItem.className = "progress-item";
  const progress = parseFloat(group.progreso) || 0;
  progressItem.innerHTML = `
        <div class="project-info">
            <h4>${group.nombre || 'Sin nombre'}</h4>
            <span>${group.nombre_del_proyecto || 'Sin proyecto'}</span>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <span class="progress-text">${progress}%</span>
    `;

  // Agregar evento click para ir al grupo
  progressItem.style.cursor = "pointer";
  progressItem.addEventListener("click", function () {
    window.location.href = `grupos.html?group=${group.identificacion}`;
  });

  return progressItem;
}

async function loadRecentTasks() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) return;

  try {
    const currentUserId = currentUser.id;

    // Obtener grupos del usuario
    const { data: allGroups, error: groupsError } = await supabase
      .from('grupos')
      .select('identificacion, miembros, creado_por');

    if (groupsError) {
      console.error('Error cargando grupos:', groupsError);
      return;
    }

    // Filtrar grupos donde el usuario es miembro o creador
    const userGroupIds = (allGroups || []).filter(group => {
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
    }).map(g => g.identificacion);

    if (userGroupIds.length === 0) {
      const recentTasks = document.getElementById("tareas-recientes");
      if (recentTasks) {
        recentTasks.innerHTML = `
            <div class="empty-state">
                <p>No hay tareas recientes</p>
                <p>Las tareas aparecerán aquí cuando se creen</p>
            </div>
        `;
      }
      return;
    }

    // Obtener tareas de los grupos del usuario desde Supabase
    const { data: userTasks, error: tasksError } = await supabase
      .from('tareas')
      .select('*')
      .in('proyecto_id', userGroupIds)
      .order('creado_en', { ascending: false })
      .limit(5);

    if (tasksError) {
      console.error('Error cargando tareas:', tasksError);
      return;
    }

    const recentTasks = document.getElementById("tareas-recientes");
    if (!recentTasks) return;

    recentTasks.innerHTML = "";

    if (!userTasks || userTasks.length === 0) {
      recentTasks.innerHTML = `
            <div class="empty-state">
                <p>No hay tareas recientes</p>
                <p>Las tareas aparecerán aquí cuando se creen</p>
            </div>
        `;
      return;
    }

    // Convertir formato de Supabase a formato esperado y crear elementos
    for (const task of userTasks) {
      const formattedTask = {
        id: task.id,
        title: task.titulo,
        description: task.descripcion,
        assigned_to: task.asignado_a,
        project_id: task.proyecto_id,
        deadline: task.fecha_limite,
        status: task.estado,
        progress: parseFloat(task.progreso) || 0,
        completed: task.completada || false,
        created_at: task.creado_en,
        submissions: task.entregas || []
      };
      
      const taskElement = await createTaskElement(formattedTask);
      recentTasks.appendChild(taskElement);
    }
  } catch (error) {
    console.error('Error en loadRecentTasks:', error);
  }
}

async function createTaskElement(task) {
  try {
    // Obtener información del grupo desde Supabase
    let groupName = "Sin grupo";
    if (task.project_id) {
      const { data: group, error: groupError } = await supabase
        .from('grupos')
        .select('nombre')
        .eq('identificacion', task.project_id)
        .single();
      
      if (!groupError && group) {
        groupName = group.nombre;
      }
    }

    // Obtener información del usuario asignado desde Supabase
    let assignedUserName = "Sin asignar";
    if (task.assigned_to) {
      const { data: user, error: userError } = await supabase
        .from('usuarios')
        .select('id, nombre')
        .eq('id', task.assigned_to)
        .single();
      
      if (!userError && user) {
        assignedUserName = user.nombre;
      }
    }

    const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !task.completed;

    const taskItem = document.createElement("div");
    taskItem.className = `task-item ${
      task.completed
        ? "completed"
        : task.status === "in-progress"
        ? "in-progress"
        : "pending"
    } ${isOverdue ? "overdue" : ""}`;
    taskItem.innerHTML = `
        <div class="task-status"></div>
        <div class="task-content">
            <h4>${task.title}</h4>
            <p>${groupName} - ${assignedUserName}</p>
        </div>
        <span class="task-date">${formatTaskDate(task.created_at)}</span>
    `;

    // Agregar evento click para ir a la tarea
    taskItem.style.cursor = "pointer";
    taskItem.addEventListener("click", function () {
      window.location.href = `tareas.html?task=${task.id}`;
    });

    return taskItem;
  } catch (error) {
    console.error('Error en createTaskElement:', error);
    return document.createElement("div"); // Retornar elemento vacío en caso de error
  }
}

async function loadRecentActivity() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) return;

  try {
    const currentUserId = currentUser.id;

    // Obtener grupos del usuario
    const { data: allGroups, error: groupsError } = await supabase
      .from('grupos')
      .select('identificacion, nombre, miembros, creado_por, progreso, creado_en');

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
        .select('*')
        .in('proyecto_id', userGroupIds)
        .order('creado_en', { ascending: false });

      if (!tasksError && tasks) {
        userTasks = tasks;
      }
    }

    // Generar actividad reciente
    const recentActivity = await generateRecentActivity(userGroups, userTasks, currentUser);

    const activityFeed = document.getElementById("actividad-reciente");
    if (!activityFeed) return;

    activityFeed.innerHTML = "";

    if (recentActivity.length === 0) {
      activityFeed.innerHTML = `
            <div class="empty-state">
                <p>No hay actividad reciente</p>
                <p>La actividad aparecerá aquí cuando haya movimiento en tus proyectos</p>
            </div>
        `;
      return;
    }

    recentActivity.forEach((activity) => {
      const activityElement = createActivityElement(activity);
      activityFeed.appendChild(activityElement);
    });
  } catch (error) {
    console.error('Error en loadRecentActivity:', error);
  }
}

async function generateRecentActivity(groups, tasks, currentUser) {
  const activities = [];

  // Actividad de tareas completadas
  const completedTasks = tasks.filter(task => task.completada === true);
  
  for (const task of completedTasks.slice(0, 2)) {
    const group = groups.find(g => g.identificacion === task.proyecto_id);
    
    // Obtener información del usuario que completó la tarea
    let userName = "Un miembro";
    if (task.entregas && task.entregas.length > 0) {
      const lastSubmission = task.entregas[task.entregas.length - 1];
      if (lastSubmission.user_id) {
        const { data: user } = await supabase
          .from('usuarios')
          .select('id, nombre')
          .eq('id', lastSubmission.user_id)
          .single();
        
        if (user) {
          userName = user.nombre;
        }
      }
    }

    activities.push({
      type: "task_completed",
      user: userName,
      group: group ? group.nombre : "Proyecto",
      task: task.titulo,
      timestamp: task.entregas && task.entregas.length > 0
        ? task.entregas[task.entregas.length - 1].submitted_at
        : task.creado_en,
    });
  }

  // Actividad de progreso de grupos
  groups
    .filter((group) => (parseFloat(group.progreso) || 0) > 0)
    .slice(0, 2)
    .forEach((group) => {
      activities.push({
        type: "group_progress",
        group: group.nombre,
        progress: parseFloat(group.progreso) || 0,
        timestamp: group.creado_en,
      });
    });

  // Actividad de nuevas tareas
  const newTasks = tasks
    .filter((task) => !task.completada)
    .slice(0, 2);

  newTasks.forEach((task) => {
    const group = groups.find(g => g.identificacion === task.proyecto_id);
    activities.push({
      type: "new_task",
      group: group ? group.nombre : "Proyecto",
      task: task.titulo,
      timestamp: task.creado_en,
    });
  });

  // Ordenar por timestamp y limitar a 5 actividades
  return activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5);
}

function createActivityElement(activity) {
  const activityItem = document.createElement("div");
  activityItem.className = "activity-item";

  let activityContent = "";
  let avatarText = "";

  switch (activity.type) {
    case "task_completed":
      avatarText = getInitials(activity.user);
      activityContent = `
                <p><strong>${
                  activity.user
                }</strong> completó la tarea <strong>${
        activity.task
      }</strong> en <strong>${activity.group}</strong></p>
                <span>${formatActivityTime(activity.timestamp)}</span>
            `;
      break;
    case "group_progress":
      avatarText = getInitials(activity.group);
      activityContent = `
                <p>El grupo <strong>${
                  activity.group
                }</strong> alcanzó el <strong>${
        activity.progress
      }%</strong> de progreso</p>
                <span>${formatActivityTime(activity.timestamp)}</span>
            `;
      break;
    case "new_task":
      avatarText = "+T";
      activityContent = `
                <p>Nueva tarea creada: <strong>${
                  activity.task
                }</strong> en <strong>${activity.group}</strong></p>
                <span>${formatActivityTime(activity.timestamp)}</span>
            `;
      break;
  }

  activityItem.innerHTML = `
        <div class="activity-avatar">${avatarText}</div>
        <div class="activity-content">
            ${activityContent}
        </div>
    `;

  return activityItem;
}

// Funciones auxiliares
function getInitials(name) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

function formatTaskDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  if (diff < 86400000) {
    // Menos de 1 día
    return "Hoy";
  } else if (diff < 172800000) {
    // Menos de 2 días
    return "Ayer";
  } else {
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  }
}

function formatActivityTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) {
    // Menos de 1 minuto
    return "Hace un momento";
  } else if (diff < 3600000) {
    // Menos de 1 hora
    const minutes = Math.floor(diff / 60000);
    return `Hace ${minutes} minuto${minutes > 1 ? "s" : ""}`;
  } else if (diff < 86400000) {
    // Menos de 1 día
    const hours = Math.floor(diff / 3600000);
    return `Hace ${hours} hora${hours > 1 ? "s" : ""}`;
  } else if (diff < 604800000) {
    // Menos de 1 semana
    const days = Math.floor(diff / 86400000);
    return `Hace ${days} día${days > 1 ? "s" : ""}`;
  } else {
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  }
}

// Actualizar el HTML del resumen para quitar elementos no necesarios
document.addEventListener("DOMContentLoaded", function () {
  // Quitar la sección de Próximos Eventos
  const dashboardGrid = document.querySelector(".dashboard-grid");
  if (dashboardGrid) {
    const eventSection = dashboardGrid.querySelector(
      ".section-card:nth-child(4)"
    ); // Asumiendo que eventos es la cuarta sección
    if (
      eventSection &&
      eventSection.querySelector("h3").textContent.includes("Eventos")
    ) {
      eventSection.remove();
    }
  }

  // Actualizar textos de estadísticas
  const statsContainer = document.querySelector(".stats-container");
  if (statsContainer) {
    const statCards = statsContainer.querySelectorAll(".stat-card");
    if (statCards.length >= 4) {
      // Reemplazar "Pendientes Urgentes" por "Progreso General"
      const thirdStat = statCards[2];
      if (thirdStat) {
        thirdStat.querySelector("p").textContent = "Progreso General";
      }
    }
  }
});

// CSS adicional para los nuevos estilos
const resumenStyles = `
    .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #6c757d;
    }

    .empty-state p {
        margin: 5px 0;
    }

    .empty-state p:first-child {
        font-weight: 500;
        color: #495057;
    }

    .progress-item {
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .progress-item:hover {
        background: #f8f9fa;
        transform: translateX(5px);
    }

    .task-item {
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .task-item:hover {
        background: #f8f9fa;
        transform: translateX(5px);
    }

    .task-item.overdue {
        border-left-color: #e74c3c;
        background: #fdedec;
    }

    .activity-item {
        cursor: default;
    }

    .stat-card {
        transition: all 0.3s ease;
    }

    .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
`;

// Injectar estilos
if (!document.querySelector("#resumen-styles")) {
  const styleElement = document.createElement("style");
  styleElement.id = "resumen-styles";
  styleElement.textContent = resumenStyles;
  document.head.appendChild(styleElement);
}

console.log("Resumen.js cargado correctamente con Supabase");
