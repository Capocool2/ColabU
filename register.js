// register.js
import { supabase } from './supabaseClient.js';

const form = document.getElementById("register-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const role = document.querySelector('input[name="role"]:checked')?.value;

  if (!name || !email || !password || !role) {
    alert("⚠️ Por favor completa todos los campos.");
    return;
  }

  try {
    // 1️⃣ Crear usuario en Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, role }
      }
    });

    if (error) throw error;
    const user = data.user;

    // 2️⃣ Insertar en tabla "usuarios"
    const { error: userError } = await supabase
      .from("usuarios")
      .insert([
        {
          id: user.id,
          nombre: name,
          correo: email,
          rol: role
        }
      ]);

    if (userError) console.error("⚠️ Error insertando en 'usuarios':", userError.message);

    // 3️⃣ Insertar también en tabla "perfiles"
    const { error: perfilError } = await supabase
      .from("perfiles")
      .insert([
        {
          identificacion: user.id,
          nombre: name,
          role: role
        }
      ]);

    if (perfilError) console.error("⚠️ Error insertando en 'perfiles':", perfilError.message);

    // 4️⃣ Guardar datos del usuario en localStorage
    const currentUser = {
      id: user.id,
      email: user.email,
      full_name: name,
      role: role
    };

    localStorage.setItem("currentUser", JSON.stringify(currentUser));

    alert(`✅ Registro exitoso. Bienvenido ${name}`);
    
    // Redirigir según el rol del usuario
    const roleLower = role?.toLowerCase();
    if (roleLower === "admin" || roleLower === "administrador") {
      window.location.href = "admin.html";
    } else if (roleLower === "docente" || role === "Docente") {
      window.location.href = "docente.html";
    } else {
      window.location.href = "index.html";
    }

  } catch (err) {
    console.error("❌ Error general:", err);
    alert("Ocurrió un error al registrar el usuario.");
  }
});



