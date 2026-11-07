import { supabase } from './config/supabaseClient.js';
import { initInactivityTimeout, logout } from './modules/auth.js';
import { renderShelvesConfig } from './modules/shelvesMap.js';
import { exportToExcel } from './modules/exports.js';

const app = document.getElementById('app');

const applyTheme = (primary, secondary) => {
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', primary || '#ffdce5');
  root.style.setProperty('--theme-secondary', secondary || '#cde5ff');
};

const renderLogin = () => {
  applyTheme('#ffdce5', '#cde5ff');

  app.innerHTML = `
    <div class="auth-card">
      <h2 style="text-align:center; margin-bottom: 24px;">Haruss Cake</h2>
      <form id="loginForm" autocomplete="off">
        <div class="form-group">
          <input type="email" id="email" class="form-input" placeholder="Usuario" autocomplete="off" required />
        </div>
        <div class="form-group">
          <input type="password" id="password" class="form-input" placeholder="Contraseña" autocomplete="off" required />
        </div>
        <button type="submit" class="btn" style="width:100%;">Iniciar Sesión</button>
      </form>
    </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("Error: " + error.message);
    } else {
      initApp();
    }
  });
};

const loadCommunityFeed = async () => {
  const feedContainer = document.getElementById('communityFeed');
  if (!feedContainer) return;

  const { data: posts, error } = await supabase
    .from('avisos_comunidad')
    .select(`
      id,
      titulo,
      mensaje,
      creado_el,
      emprendedores (
        nombre_marca,
        facebook_url,
        instagram_url,
        whatsapp_num,
        pagina_web
      )
    `)
    .order('creado_el', { ascending: false });

  if (error) {
    feedContainer.innerHTML = `<p>Error al cargar avisos.</p>`;
    return;
  }

  if (!posts || posts.length === 0) {
    feedContainer.innerHTML = `<p style="color:#718096; font-size:13px;">No hay avisos recientes en el showroom.</p>`;
    return;
  }

  feedContainer.innerHTML = posts.map(post => {
    const emp = post.emprendedores || {};
    const redes = [];
    if (emp.facebook_url) redes.push(`<a href="${emp.facebook_url}" target="_blank" class="social-tag">FB</a>`);
    if (emp.instagram_url) redes.push(`<a href="${emp.instagram_url}" target="_blank" class="social-tag">IG</a>`);
    if (emp.whatsapp_num) redes.push(`<a href="https://wa.me/${emp.whatsapp_num}" target="_blank" class="social-tag">WHA</a>`);
    if (emp.pagina_web) redes.push(`<a href="${emp.pagina_web}" target="_blank" class="social-tag">Web</a>`);

    return `
      <div class="post-card">
        <div class="brand-badge">${emp.nombre_marca || 'Comunidad Haruss'}</div>
        <h4 style="margin: 4px 0 8px 0;">${post.titulo}</h4>
        <p style="font-size: 13px; line-height: 1.4; margin: 0;">${post.mensaje}</p>
        ${redes.length > 0 ? `<div class="social-links">${redes.join('')}</div>` : ''}
      </div>
    `;
  }).join('');
};

const renderDashboard = (profile, role) => {
  initInactivityTimeout();

  if (role === 'emprendedor') {
    applyTheme(profile.color_primario, profile.color_secundario);
  } else {
    applyTheme('#ffdce5', '#cde5ff');
  }

  app.innerHTML = `
    <header style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; border-bottom: 2px solid var(--haruss-blue); padding-bottom: 12px;">
      <div>
        <h1 style="margin:0;">Haruss Cake</h1>
        <small style="font-weight:600;">Panel: ${role === 'emprendedor' ? profile.nombre_marca : role.toUpperCase()}</small>
      </div>
      <button id="logoutBtn" class="btn btn-secondary">Cerrar Sesión</button>
    </header>

    <div class="main-layout">
      <!-- Muro Comunitario -->
      <section class="card-panel">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0;">Muro Comunitario del Showroom (Avisos entre Emprendedores)</h3>
          <small style="color: #718096;">*Espacio exclusivo para avisos informativos, no para ventas</small>
        </div>

        <form id="newPostForm" style="margin-top: 16px;" autocomplete="off">
          <div class="form-group">
            <input type="text" id="postTitle" class="form-input" placeholder="Título del aviso..." required />
          </div>
          <div class="form-group">
            <textarea id="postContent" class="form-input" rows="2" placeholder="Mensaje para los demás emprendedores del showroom..." required></textarea>
          </div>
          <button type="submit" class="btn">Publicar Aviso</button>
        </form>

        <div id="communityFeed" class="feed-grid"></div>
      </section>

      <!-- Panel Emprendedor: Marca y Reservas -->
      ${role === 'emprendedor' ? `
        <section class="card-panel">
          <h3>Personalización de Marca y Redes Sociales</h3>
          <form id="brandProfileForm" autocomplete="off">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="form-group">
                <label>Color Primario de tu Marca:</label>
                <input type="color" id="primaryColor" value="${profile.color_primario || '#ffdce5'}" style="width:100%; height:40px; border:none; cursor:pointer;" />
              </div>
              <div class="form-group">
                <label>Color Secundario de tu Marca:</label>
                <input type="color" id="secondaryColor" value="${profile.color_secundario || '#cde5ff'}" style="width:100%; height:40px; border:none; cursor:pointer;" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="form-group">
                <input type="url" id="fbUrl" class="form-input" placeholder="Enlace Facebook" value="${profile.facebook_url || ''}" />
              </div>
              <div class="form-group">
                <input type="url" id="igUrl" class="form-input" placeholder="Enlace Instagram" value="${profile.instagram_url || ''}" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="form-group">
                <input type="text" id="whaNum" class="form-input" placeholder="WhatsApp (ej. 525512345678)" value="${profile.whatsapp_num || ''}" />
              </div>
              <div class="form-group">
                <input type="url" id="webUrl" class="form-input" placeholder="Página Web oficial" value="${profile.pagina_web || ''}" />
              </div>
            </div>

            <button type="submit" class="btn">Guardar Personalización</button>
          </form>
        </section>

        <section class="card-panel">
          <h3>Solicitar Reserva de Espacio para Taller o Curso</h3>
          <form id="bookingForm">
            <div class="form-group">
              <label>Fecha y Hora del Evento:</label>
              <input type="datetime-local" id="bookDate" class="form-input" required />
            </div>
            <div style="margin: 14px 0;">
              <label style="font-size: 13px; line-height: 1.4;">
                <input type="checkbox" id="policyAccept" required />
                Acepto que el préstamo del espacio no tiene costo, pero todo el consumo de alimentos y bebidas durante el evento debe ser exclusivamente de la cafetería y de los emprendedores del showroom.
              </label>
            </div>
            <button type="submit" class="btn">Enviar Solicitud</button>
          </form>
        </section>
      ` : ''}

      <!-- Panel Haruss Cake Staff -->
      ${role === 'duena' || role === 'admin' ? `
        <section class="card-panel">
          <h3>Administración Haruss Cake</h3>
          <button id="btnShelves" class="btn">Ver Mapa de Anaqueles</button>
          <button id="btnExport" class="btn btn-secondary">Exportar Reporte a Excel</button>
          <div id="shelvesView" style="margin-top: 20px;"></div>
        </section>
      ` : ''}

      <!-- Punto de Venta (Kevin y Staff) -->
      ${role === 'empleado' || role === 'duena' || role === 'admin' ? `
        <section class="card-panel">
          <h3>Terminal Punto de Venta</h3>
          <input type="text" id="posSearch" class="form-input" placeholder="Escanear o teclear SKU / Código de barras..." />
          <div id="posResults" style="margin-top: 12px;"></div>
        </section>
      ` : ''}
    </div>
  `;

  document.getElementById('logoutBtn').addEventListener('click', logout);
  loadCommunityFeed();

  document.getElementById('newPostForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = document.getElementById('postTitle').value;
    const mensaje = document.getElementById('postContent').value;

    const { error } = await supabase.from('avisos_comunidad').insert({
      emprendedor_id: profile.id,
      titulo,
      mensaje
    });

    if (error) {
      alert("Error: " + error.message);
    } else {
      document.getElementById('newPostForm').reset();
      loadCommunityFeed();
    }
  });

  const profileForm = document.getElementById('brandProfileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const color_primario = document.getElementById('primaryColor').value;
      const color_secundario = document.getElementById('secondaryColor').value;
      const facebook_url = document.getElementById('fbUrl').value;
      const instagram_url = document.getElementById('igUrl').value;
      const whatsapp_num = document.getElementById('whaNum').value;
      const pagina_web = document.getElementById('webUrl').value;

      const { error } = await supabase.from('emprendedores').update({
        color_primario,
        color_secundario,
        facebook_url,
        instagram_url,
        whatsapp_num,
        pagina_web
      }).eq('id', profile.id);

      if (error) {
        alert("Error: " + error.message);
      } else {
        alert("Colores y enlaces actualizados.");
        profile.color_primario = color_primario;
        profile.color_secundario = color_secundario;
        applyTheme(color_primario, color_secundario);
      }
    });
  }

  if (document.getElementById('bookingForm')) {
    document.getElementById('bookingForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const dt = document.getElementById('bookDate').value;
      const accepted = document.getElementById('policyAccept').checked;

      const { error } = await supabase.from('reservas_eventos').insert({
        emprendedor_id: profile.id,
        fecha_inicio: new Date(dt).toISOString(),
        fecha_fin: new Date(new Date(dt).getTime() + 7200000).toISOString(),
        politica_consumo_aceptada: accepted,
        estado: 'solicitada'
      });

      if (!error) {
        alert("Solicitud registrada con éxito para revisión del equipo.");
      } else {
        alert(error.message);
      }
    });
  }

  if (document.getElementById('btnShelves')) {
    document.getElementById('btnShelves').addEventListener('click', () => {
      renderShelvesConfig(document.getElementById('shelvesView'));
    });
  }

  if (document.getElementById('btnExport')) {
    document.getElementById('btnExport').addEventListener('click', async () => {
      const { data } = await supabase.from('ventas').select('*');
      exportToExcel(data || [], 'Ventas_Haruss_Cake.xlsx');
    });
  }
};

const initApp = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    renderLogin();
    return;
  }

  const uid = session.user.id;
  const { data: harusStaff } = await supabase.from('perfiles_harus').select('*').eq('id', uid).single();

  if (harusStaff) {
    renderDashboard(harusStaff, harusStaff.rol);
  } else {
    const { data: emp } = await supabase.from('emprendedores').select('*').eq('id', uid).single();
    renderDashboard(emp || { id: uid }, 'emprendedor');
  }
};

initApp();
