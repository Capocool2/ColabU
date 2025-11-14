// login.js
import { supabase } from './supabaseClient.js';

const form = document.getElementById("login-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Por favor completa todos los campos.");
    return;
  }

  try {
    // Iniciar sesión con Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error("Error al iniciar sesión:", error.message);
      alert("❌ " + error.message);
      return;
    }

    const user = data.user;

    // Cargar perfil del usuario desde la tabla "usuarios" (o "profiles")
    const { data: profile, error: profileError } = await supabase
      .from("usuarios") // cambia a "profiles" si tu tabla se llama así
      .select("id, nombre, rol, correo")
      .eq("correo", email)
      .single();

    // Guardar todo en "currentUser" (la clave que tu user-manage.js espera)
    const currentUser = {
      id: user.id,
      email: user.email,
      full_name: profile?.nombre || user.email,
      role: profile?.rol || "usuario"
    };

    localStorage.setItem("currentUser", JSON.stringify(currentUser));

    alert("✅ Bienvenido " + currentUser.full_name);
    
    // Redirigir según el rol del usuario
    const userRole = currentUser.role?.toLowerCase();
    if (userRole === "admin" || userRole === "administrador") {
      window.location.href = "admin.html";
    } else if (userRole === "docente") {
      window.location.href = "docente.html";
    } else {
      window.location.href = "resumen.html";
    } 
    
  } catch (err) {
    console.error("Excepción:", err);
    alert("Ocurrió un error inesperado.");
  }
});
