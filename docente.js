// [file name]: docente.js
document.addEventListener('DOMContentLoaded', function() {
    if (!userManager.currentUser || userManager.currentUser.role !== 'teacher') {
        alert('Acceso denegado. Esta página es solo para docentes.');
        window.location.href = 'resumen.html';
        return;
    }

    loadTeacherDashboard();
});

function loadTeacherDashboard() {
    updateTeacherStats();
    loadTeacherGroups();
    loadPendingEvaluations();
}

function updateTeacherStats() {
    const groups = JSON.parse(localStorage.getItem('colabu_groups') || '[]');
    const teacherGroups = groups.filter(group => 
        group.members.some(member => 
            member.user_id === userManager.currentUser.id && 
            member.role.includes('Líder')
        )
    );

    const allStudents = new Set();
    let totalProgress = 0;
    let pendingTasksCount = 0;

    teacherGroups.forEach(group => {
        // Contar estudiantes
        group.members.forEach(member => {
            if (member.role !== 'Líder de proyecto') {
                allStudents.add(member.user_id);
            }
        });

        // Sumar progreso
        totalProgress += group.progress || 0;

        // Contar tareas pendientes (simulado)
        pendingTasksCount += Math.floor(Math.random() * 5) + 1;
    });

    // Actualizar UI
    document.getElementById('totalGroups').textContent = teacherGroups.length;
    document.getElementById('totalStudents').textContent = allStudents.size;
    document.getElementById('avgProgress').textContent = teacherGroups.length > 0 
        ? Math.round(totalProgress / teacherGroups.length) + '%' 
        : '0%';
    document.getElementById('pendingTasks').textContent = pendingTasksCount;
}

function loadTeacherGroups() {
    const groups = JSON.parse(localStorage.getItem('colabu_groups') || '[]');
    const users = JSON.parse(localStorage.getItem('colabu_users') || '[]');
    
    const teacherGroups = groups.filter(group => 
        group.members.some(member => 
            member.user_id === userManager.currentUser.id && 
            member.role.includes('Líder')
        )
    );

    const container = document.getElementById('teacherGroups');
    if (!container) return;

    container.innerHTML = '';

    if (teacherGroups.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No tienes grupos asignados</p>
                <p>Los grupos que lideres aparecerán aquí</p>
            </div>
        `;
        return;
    }

    teacherGroups.forEach(group => {
        const groupElement = createTeacherGroupElement(group, users);
        container.appendChild(groupElement);
    });
}

function createTeacherGroupElement(group, users) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'teacher-group-card';
    
    const students = group.members.filter(member => 
        !member.role.includes('Líder')
    );

    groupDiv.innerHTML = `
        <div class="group-header">
            <div class="group-title">
                <h4>${group.name}</h4>
                <p>${group.project_name}</p>
            </div>
            <div class="group-actions">
                <button class="btn btn-outline" onclick="viewGroupDetails(${group.id})">Detalles</button>
                <button class="btn btn-primary" onclick="evaluateGroup(${group.id})">Evaluar</button>
            </div>
        </div>

        <div class="group-progress">
            <div class="progress-header">
                <span>Progreso General del Grupo</span>
                <strong>${group.progress}%</strong>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${group.progress}%"></div>
            </div>
        </div>

        <div class="students-progress">
            <h5>Progreso de Estudiantes</h5>
            ${students.map(student => {
                const user = users.find(u => u.id === student.user_id);
                const studentProgress = calculateStudentProgress(student.user_id, group.id);
                return `
                    <div class="student-item">
                        <div class="student-avatar">${userManager.getUserInitials(student.name)}</div>
                        <div class="student-info">
                            <div class="student-name">${student.name}</div>
                            <div class="student-role">${student.role}</div>
                        </div>
                        <div class="student-progress">
                            <div class="progress-bar-small">
                                <div class="progress-fill" style="width: ${studentProgress}%"></div>
                            </div>
                            <span class="progress-text">${studentProgress}%</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>

        <div class="group-progress-overview">
            <div class="progress-summary">
                <span>📅 Entrega: ${formatDate(group.deadline)}</span>
                <span>👥 ${students.length} estudiantes</span>
                <span>✅ ${getCompletedTasksCount(group.id)} tareas</span>
            </div>
        </div>
    `;

    return groupDiv;
}

function calculateStudentProgress(studentId, groupId) {
    // Simular progreso individual del estudiante
    // En un sistema real, esto calcularía basado en tareas completadas
    const tasks = JSON.parse(localStorage.getItem('colabu_tasks') || '[]');
    const groupTasks = tasks.filter(task => task.project_id === groupId);
    
    if (groupTasks.length === 0) return 0;

    const completedTasks = groupTasks.filter(task => 
        task.assigned_to === studentId && task.completed
    ).length;

    return Math.round((completedTasks / groupTasks.length) * 100);
}

function getCompletedTasksCount(groupId) {
    const tasks = JSON.parse(localStorage.getItem('colabu_tasks') || '[]');
    return tasks.filter(task => task.project_id === groupId && task.completed).length;
}

function loadPendingEvaluations() {
    const groups = JSON.parse(localStorage.getItem('colabu_groups') || '[]');
    const tasks = JSON.parse(localStorage.getItem('colabu_tasks') || '[]');
    const users = JSON.parse(localStorage.getItem('colabu_users') || '[]');
    
    const teacherGroups = groups.filter(group => 
        group.members.some(member => 
            member.user_id === userManager.currentUser.id && 
            member.role.includes('Líder')
        )
    );

    const pendingEvaluations = [];
    
    teacherGroups.forEach(group => {
        const groupTasks = tasks.filter(task => 
            task.project_id === group.id && 
            task.completed && 
            !task.graded
        );

        groupTasks.forEach(task => {
            const assignedUser = users.find(u => u.id === task.assigned_to);
            pendingEvaluations.push({
                task: task,
                group: group,
                student: assignedUser,
                dueDate: task.deadline
            });
        });
    });

    displayPendingEvaluations(pendingEvaluations);
}

function displayPendingEvaluations(evaluations) {
    const container = document.getElementById('pendingEvaluations');
    if (!container) return;

    container.innerHTML = '';

    if (evaluations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No hay evaluaciones pendientes</p>
                <p>Las tareas completadas aparecerán aquí para calificar</p>
            </div>
        `;
        return;
    }

    evaluations.forEach(evaluation => {
        const evaluationElement = createEvaluationElement(evaluation);
        container.appendChild(evaluationElement);
    });
}

function createEvaluationElement(evaluation) {
    const div = document.createElement('div');
    div.className = 'evaluation-item';
    
    div.innerHTML = `
        <div class="evaluation-info">
            <h4>${evaluation.task.title}</h4>
            <p>${evaluation.group.name} - ${evaluation.student.full_name}</p>
            <div class="evaluation-meta">
                <span>📅 ${formatDate(evaluation.dueDate)}</span>
                <span>📝 Entregado: ${formatDate(evaluation.task.submitted_at)}</span>
            </div>
        </div>
        <div class="evaluation-actions">
            <input type="number" class="grade-input" placeholder="Nota" min="0" max="10" step="0.1">
            <button class="btn btn-primary" onclick="gradeTask(${evaluation.task.id}, this)">Calificar</button>
            <button class="btn btn-outline" onclick="viewSubmission(${evaluation.task.id})">Revisar</button>
        </div>
    `;

    return div;
}

function gradeTask(taskId, button) {
    const input = button.parentElement.querySelector('.grade-input');
    const grade = parseFloat(input.value);
    
    if (isNaN(grade) || grade < 0 || grade > 10) {
        alert('Por favor ingresa una nota válida entre 0 y 10');
        return;
    }

    // Actualizar tarea con la calificación
    const tasks = JSON.parse(localStorage.getItem('colabu_tasks') || '[]');
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
        tasks[taskIndex].graded = true;
        tasks[taskIndex].grade = grade;
        tasks[taskIndex].graded_at = new Date().toISOString();
        tasks[taskIndex].graded_by = userManager.currentUser.id;
        
        localStorage.setItem('colabu_tasks', JSON.stringify(tasks));
        
        showAlert('Tarea calificada exitosamente', 'success');
        loadPendingEvaluations();
    }
}

function viewGroupDetails(groupId) {
    // Redirigir a la página de grupos con el grupo específico
    window.location.href = `grupos.html?group=${groupId}&view=teacher`;
}

function evaluateGroup(groupId) {
    // Mostrar modal de evaluación grupal
    showEvaluationModal(groupId);
}

function showEvaluationModal(groupId) {
    const groups = JSON.parse(localStorage.getItem('colabu_groups') || '[]');
    const group = groups.find(g => g.id === groupId);
    
    if (!group) return;

    const modalHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Evaluación Grupal - ${group.name}</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="evaluation-form">
                        <div class="form-group">
                            <label>Calificación Grupal (0-10)</label>
                            <input type="number" id="groupGrade" min="0" max="10" step="0.1" placeholder="8.5">
                        </div>
                        <div class="form-group">
                            <label>Comentarios y Retroalimentación</label>
                            <textarea id="groupFeedback" rows="4" placeholder="Escribe tus comentarios sobre el trabajo del grupo..."></textarea>
                        </div>
                        <div class="form-group">
                            <label>Areas de Mejora</label>
                            <div class="improvement-areas">
                                <label><input type="checkbox" value="investigacion"> Investigación</label>
                                <label><input type="checkbox" value="diseno"> Diseño</label>
                                <label><input type="checkbox" value="implementacion"> Implementación</label>
                                <label><input type="checkbox" value="documentacion"> Documentación</label>
                                <label><input type="checkbox" value="presentacion"> Presentación</label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="submitGroupEvaluation(${groupId})">Guardar Evaluación</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setupModalEvents();
}

function submitGroupEvaluation(groupId) {
    const grade = parseFloat(document.getElementById('groupGrade').value);
    const feedback = document.getElementById('groupFeedback').value;
    
    if (isNaN(grade) || grade < 0 || grade > 10) {
        alert('Por favor ingresa una calificación válida');
        return;
    }

    // Guardar evaluación grupal
    const groupEvaluations = JSON.parse(localStorage.getItem('colabu_group_evaluations') || '[]');
    
    groupEvaluations.push({
        id: Date.now(),
        group_id: groupId,
        grade: grade,
        feedback: feedback,
        evaluated_by: userManager.currentUser.id,
        evaluated_at: new Date().toISOString()
    });

    localStorage.setItem('colabu_group_evaluations', JSON.stringify(groupEvaluations));
    
    showAlert('Evaluación grupal guardada exitosamente', 'success');
    closeModal();
}

// Funciones auxiliares
function formatDate(dateString) {
    if (!dateString) return 'No definida';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
}

function showAlert(message, type) {
    // Implementación de alerta (similar a la existente en auth.js)
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
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
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
    `;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
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

// Hacer funciones globales
window.gradeTask = gradeTask;
window.viewGroupDetails = viewGroupDetails;
window.evaluateGroup = evaluateGroup;
window.closeModal = closeModal;