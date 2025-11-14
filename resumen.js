// Resumen General - ColabU
document.addEventListener("DOMContentLoaded", function () {
  loadDashboardData();
});

function loadDashboardData() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) return;

  // Cargar datos actualizados
  updateDashboardStats();
  loadGroupProgress();
  loadRecentTasks();
  loadRecentActivity();
}

function updateDashboardStats() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) return;

  const groups = JSON.parse(localStorage.getItem("colabu_groups") || "[]");
  const tasks = JSON.parse(localStorage.getItem("colabu_tasks") || "[]");

  // Filtrar grupos del usuario
  const userGroups = groups.filter((group) =>
    group.members.some((member) => member.user_id === currentUser.id)
  );

  // Calcular estadísticas reales
  const totalGroups = userGroups.length;

  // Tareas completadas
  const completedTasks = tasks.filter(
    (task) =>
      task.completed && userGroups.some((group) => group.id === task.project_id)
  ).length;

  // Total de colaboradores únicos en todos los grupos
  const allCollaborators = new Set();
  userGroups.forEach((group) => {
    group.members.forEach((member) => {
      allCollaborators.add(member.user_id);
    });
  });
  const totalCollaborators = allCollaborators.size;

  // Progreso promedio de todos los grupos
  const averageProgress =
    userGroups.length > 0
      ? Math.round(
          userGroups.reduce((sum, group) => sum + group.progress, 0) /
            userGroups.length
        )
      : 0;

  // Actualizar UI
  const statCards = document.querySelectorAll(".stat-card");
  if (statCards.length >= 4) {
    statCards[0].querySelector("h3").textContent = totalGroups;
    statCards[1].querySelector("h3").textContent = completedTasks;
    statCards[2].querySelector("h3").textContent = averageProgress + "%";
    statCards[3].querySelector("h3").textContent = totalCollaborators;

    // Actualizar textos descriptivos
    statCards[0].querySelector("p").textContent = "Grupos Activos";
    statCards[1].querySelector("p").textContent = "Tareas Completadas";
    statCards[2].querySelector("p").textContent = "Progreso General";
    statCards[3].querySelector("p").textContent = "Colaboradores";
  }
}

function loadGroupProgress() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) return;

  const groups = JSON.parse(localStorage.getItem("colabu_groups") || "[]");
  const userGroups = groups.filter((group) =>
    group.members.some((member) => member.user_id === currentUser.id)
  );

  const progressList = document.querySelector(".progress-list");
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
}

function createProgressElement(group) {
  const progressItem = document.createElement("div");
  progressItem.className = "progress-item";
  progressItem.innerHTML = `
        <div class="project-info">
            <h4>${group.name}</h4>
            <span>${group.project_name}</span>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${group.progress}%"></div>
        </div>
        <span class="progress-text">${group.progress}%</span>
    `;

  // Agregar evento click para ir al grupo
  progressItem.style.cursor = "pointer";
  progressItem.addEventListener("click", function () {
    window.location.href = `grupos.html?group=${group.id}`;
  });

  return progressItem;
}

function loadRecentTasks() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) return;

  const tasks = JSON.parse(localStorage.getItem("colabu_tasks") || "[]");
  const groups = JSON.parse(localStorage.getItem("colabu_groups") || "[]");

  // Filtrar tareas de los grupos del usuario y ordenar por fecha de creación
  const userTasks = tasks
    .filter((task) =>
      groups.some(
        (group) =>
          group.id === task.project_id &&
          group.members.some((member) => member.user_id === currentUser.id)
      )
    )
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5); // Mostrar solo las 5 más recientes

  const recentTasks = document.querySelector(".recent-tasks");
  if (!recentTasks) return;

  recentTasks.innerHTML = "";

  if (userTasks.length === 0) {
    recentTasks.innerHTML = `
            <div class="empty-state">
                <p>No hay tareas recientes</p>
                <p>Las tareas aparecerán aquí cuando se creen</p>
            </div>
        `;
    return;
  }

  userTasks.forEach((task) => {
    const taskElement = createTaskElement(task);
    recentTasks.appendChild(taskElement);
  });
}

function createTaskElement(task) {
  const groups = JSON.parse(localStorage.getItem("colabu_groups") || "[]");
  const users = JSON.parse(localStorage.getItem("colabu_users") || "[]");

  const group = groups.find((g) => g.id === task.project_id);
  const assignedUser = users.find((u) => u.id === task.assigned_to);
  const isOverdue = new Date(task.deadline) < new Date() && !task.completed;

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
            <p>${group ? group.name : "Sin grupo"} - ${
    assignedUser ? assignedUser.full_name : "Sin asignar"
  }</p>
        </div>
        <span class="task-date">${formatTaskDate(task.created_at)}</span>
    `;

  // Agregar evento click para ir a la tarea
  taskItem.style.cursor = "pointer";
  taskItem.addEventListener("click", function () {
    window.location.href = `tareas.html?task=${task.id}`;
  });

  return taskItem;
}

function loadRecentActivity() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) return;

  const groups = JSON.parse(localStorage.getItem("colabu_groups") || "[]");
  const tasks = JSON.parse(localStorage.getItem("colabu_tasks") || "[]");

  // Simular actividad reciente basada en tareas y grupos
  const recentActivity = generateRecentActivity(groups, tasks, currentUser);

  const activityFeed = document.querySelector(".activity-feed");
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
}

function generateRecentActivity(groups, tasks, currentUser) {
  const activities = [];
  const userGroups = groups.filter((group) =>
    group.members.some((member) => member.user_id === currentUser.id)
  );

  // Actividad de tareas completadas
  const completedTasks = tasks.filter(
    (task) =>
      task.completed && userGroups.some((group) => group.id === task.project_id)
  );

  completedTasks.slice(0, 2).forEach((task) => {
    const group = groups.find((g) => g.id === task.project_id);
    const user =
      task.submissions && task.submissions.length > 0
        ? task.submissions[task.submissions.length - 1].user_name
        : "Un miembro";

    activities.push({
      type: "task_completed",
      user: user,
      group: group ? group.name : "Proyecto",
      task: task.title,
      timestamp:
        task.submissions && task.submissions.length > 0
          ? task.submissions[task.submissions.length - 1].submitted_at
          : task.created_at,
    });
  });

  // Actividad de progreso de grupos
  userGroups
    .filter((group) => group.progress > 0)
    .slice(0, 2)
    .forEach((group) => {
      activities.push({
        type: "group_progress",
        group: group.name,
        progress: group.progress,
        timestamp: group.created_at,
      });
    });

  // Actividad de nuevas tareas
  const newTasks = tasks
    .filter(
      (task) =>
        !task.completed &&
        userGroups.some((group) => group.id === task.project_id)
    )
    .slice(0, 2);

  newTasks.forEach((task) => {
    const group = groups.find((g) => g.id === task.project_id);
    activities.push({
      type: "new_task",
      group: group ? group.name : "Proyecto",
      task: task.title,
      timestamp: task.created_at,
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

console.log("Resumen.js cargado correctamente");
