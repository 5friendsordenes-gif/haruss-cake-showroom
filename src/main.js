import { supabase } from './config/supabaseClient.js';
import { initInactivityTimeout, logout } from './modules/auth.js';
import { exportToExcel } from './modules/exports.js';
import { notificarCorte, notificarMovimientoInventario } from './config/emailjsConfig.js';

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
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("Error: " + error.message);
    } else {
      initApp();
    }
  });
};

// Cargar muro comunitario
const loadCommunityFeed = async () => {
  const feedContainer = document.getElementById('communityFeed');
  if (!feedContainer) return;

  const { data: posts, error } = await supabase
    .from('avisos_comunidad')
    .select(`
      id, titulo, mensaje, creado_el,
      emprendedores ( nombre_marca, facebook_url, instagram_url, whatsapp_num, pagina_web )
    `)
    .order('creado_el', { ascending: false });

  if (error || !posts || posts.length === 0) {
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

// Renderizar Mapa de Anaqueles y asignación
const loadShelvesMap = async () => {
  const container = document.getElementById('shelvesMapContainer');
  if (!container) return;

  const [{ data: slots }, { data: emps }] = await Promise.all([
    supabase.from('anaqueles_slots').select('*').order('codigo_slot'),
    supabase.from('emprendedores').select('id, nombre_marca')
  ]);

  const empMap = (emps || []).reduce((acc, curr) => ({ ...acc, [curr.id]: curr.nombre_marca }), {});
  const leftSlots = (slots || []).filter(s => s.pared === 'izquierda');
  const rightSlots = (slots || []).filter(s => s.pared === 'derecha');

  const renderSlots = (items) => items.map(slot => `
    <div class="slot-cell ${slot.emprendedor_id ? 'slot-occupied' : ''}" style="margin-bottom:8px;">
      <strong>${slot.codigo_slot}</strong><br>
      <small>${slot.emprendedor_id ? (empMap[slot.emprendedor_id] || 'Asignado') : 'Disponible'}</small><br>
      <select onchange="window.assignSlot('${slot.id}', this.value)" style="font-size:10px; margin-top:4px;">
        <option value="">-- Libre --</option>
        ${(emps || []).map(e => `<option value="${e.id}" ${slot.emprendedor_id === e.id ? 'selected' : ''}>${e.nombre_marca}</option>`).join('')}
      </select>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="showroom-layout">
      <div class="wall-column">
        <h4>Pared Izquierda (${leftSlots.length} slots)</h4>
        <div class="shelf-box">${renderSlots(leftSlots)}</div>
      </div>
      <div class="wall-column">
        <h4>Pared Derecha (${rightSlots.length} slots)</h4>
        <div class="shelf-box">${renderSlots(rightSlots)}</div>
      </div>
    </div>
  `;
};

// Asignación global expuesta en window
window.assignSlot = async (slotId, emprendedorId) => {
  const { error } = await supabase.from('anaqueles_slots').update({
    emprendedor_id: emprendedorId || null
  }).eq('id', slotId);

  if (error) alert("Error al asignar slot: " + error.message);
  else loadShelvesMap();
};

const renderDashboard = async (profile, role) => {
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
        <small style="font-weight:600;">Panel: ${role === 'emprendedor' ? profile.nombre_marca : (profile.nombre + ' (' + role.toUpperCase() + ')')}</small>
      </div>
      <button id="logoutBtn" class="btn btn-secondary">Cerrar Sesión</button>
    </header>

    <div class="main-layout">
      <!-- Muro Comunitario -->
      <section class="card-panel">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0;">Muro Comunitario del Showroom</h3>
          <small style="color: #718096;">*Avisos y comunicados generales entre marcas</small>
        </div>

        <form id="newPostForm" style="margin-top: 16px;" autocomplete="off">
          <div class="form-group">
            <input type="text" id="postTitle" class="form-input" placeholder="Título del aviso..." required />
          </div>
          <div class="form-group">
            <textarea id="postContent" class="form-input" rows="2" placeholder="Mensaje para el showroom..." required></textarea>
          </div>
          <button type="submit" class="btn">Publicar Aviso</button>
        </form>

        <div id="communityFeed" class="feed-grid"></div>
      </section>

      <!-- SECCIONES EXCLUSIVAS HARUSS CAKE (Betty / Admin) -->
      ${role === 'duena' || role === 'admin' ? `
        <!-- Constructor y Mapa de Anaqueles -->
        <section class="card-panel">
          <h3>Constructor y Mapa de Anaqueles del Showroom</h3>
          <form id="shelfBuilderForm" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:12px; margin-bottom:16px;">
            <select id="shelfWall" class="form-input">
              <option value="izquierda">Pared Izquierda</option>
              <option value="derecha">Pared Derecha</option>
            </select>
            <input type="number" id="shelfNum" class="form-input" placeholder="No. Anaquel" required min="1" />
            <input type="number" id="shelfFloors" class="form-input" placeholder="Pisos/Slots" required min="1" />
            <button type="submit" class="btn">Generar Slots</button>
          </form>
          <div id="shelvesMapContainer"></div>
        </section>

        <!-- Punto de Venta (POS) con autocompletado y descuente de stock -->
        <section class="card-panel">
          <h3>Punto de Venta (Caja Showroom)</h3>
          <form id="posSaleForm" style="display:grid; grid-template-columns: 2fr 1fr 1fr auto; gap:12px;">
            <input type="text" id="posSku" class="form-input" placeholder="Escanear o teclear SKU..." required />
            <input type="number" id="posQty" class="form-input" placeholder="Cantidad" value="1" min="1" required />
            <input type="number" step="0.01" id="posPrice" class="form-input" placeholder="Precio ($)" required />
            <button type="submit" class="btn">Cobrar Venta</button>
          </form>
        </section>

        <!-- Horarios y Bloqueos de Emergencia -->
        <section class="card-panel">
          <h3>Gestión de Horarios y Excepciones/Cierres</h3>
          <form id="holidayForm" style="display:grid; grid-template-columns: 1fr 1fr 2fr auto; gap:12px; margin-bottom:16px;">
            <input type="datetime-local" id="blockStart" class="form-input" required />
            <input type="datetime-local" id="blockEnd" class="form-input" required />
            <input type="text" id="blockReason" class="form-input" placeholder="Motivo (Vacaciones / Percance / Mantenimiento)" required />
            <button type="submit" class="btn btn-secondary">Bloquear Fechas</button>
          </form>
        </section>

        <!-- Registro de Cortes y Depósitos con EmailJS -->
        <section class="card-panel">
          <h3>Cortes de Caja y Depósitos a Emprendedores</h3>
          <form id="corteForm" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
            <input type="text" id="corteEmpId" class="form-input" placeholder="ID del Emprendedor" required />
            <input type="email" id="corteEmpEmail" class="form-input" placeholder="Correo del Emprendedor" required />
            <input type="text" id="corteEmpMarca" class="form-input" placeholder="Nombre Marca" required />
            <input type="number" step="0.01" id="corteMonto" class="form-input" placeholder="Monto ($)" required />
            <input type="file" id="corteFile" class="form-input" accept="image/*,application/pdf" required />
            <button type="submit" class="btn">Subir Comprobante y Notificar</button>
          </form>
        </section>

        <!-- Aprobación de Reservas y Exportación -->
        <section class="card-panel">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3>Auditoría y Reportes</h3>
            <button id="btnExport" class="btn btn-secondary">Descargar Reporte en Excel</button>
          </div>
          <div id="reservasAdminView" style="margin-top:16px;"></div>
        </section>
      ` : ''}

      <!-- PANEL EXCLUSIVO DEL EMPRENDEDOR -->
      ${role === 'emprendedor' ? `
        <!-- Catálogo de Productos y SKUs -->
        <section class="card-panel">
          <h3>Mi Catálogo de Productos y Variantes</h3>
          <form id="addProductForm" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:12px; margin-bottom:16px;">
            <input type="text" id="prodName" class="form-input" placeholder="Nombre Producto" required />
            <input type="text" id="prodSku" class="form-input" placeholder="SKU / Código barras" required />
            <input type="text" id="prodVariant" class="form-input" placeholder="Variante (ej. Rojo)" required />
            <input type="number" id="prodStock" class="form-input" placeholder="Stock Inicial" min="0" required />
            <input type="number" step="0.01" id="prodSalePrice" class="form-input" placeholder="Precio Venta ($)" required />
            <input type="number" step="0.01" id="prodCost" class="form-input" placeholder="Costo Prod (Privado $)" required />
            <button type="submit" class="btn">Registrar SKU</button>
          </form>
          <div id="catalogList"></div>
        </section>

        <!-- Solicitud de Reserva de Espacio con Aceptación Obligatoria -->
        <section class="card-panel">
          <h3>Solicitud de Préstamo de Cafetería para Cursos/Eventos</h3>
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
            <button type="submit" class="btn">Enviar Solicitud a Haruss Cake</button>
          </form>
        </section>

        <!-- Personalización Visual y Redes -->
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
      ` : ''}
    </div>
  `;

  document.getElementById('logoutBtn').addEventListener('click', logout);
  loadCommunityFeed();

  // Publicar aviso comunitario
  document.getElementById('newPostForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = document.getElementById('postTitle').value;
    const mensaje = document.getElementById('postContent').value;

    const { error } = await supabase.from('avisos_comunidad').insert({
      emprendedor_id: profile.id,
      titulo,
      mensaje
    });

    if (error) alert(error.message);
    else {
      document.getElementById('newPostForm').reset();
      loadCommunityFeed();
    }
  });

  // Eventos de Administrador (Betty)
  if (role === 'duena' || role === 'admin') {
    loadShelvesMap();

    // Constructor de anaqueles
    document.getElementById('shelfBuilderForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const wall = document.getElementById('shelfWall').value;
      const num = parseInt(document.getElementById('shelfNum').value);
      const floors = parseInt(document.getElementById('shelfFloors').value);

      const slotsToInsert = [];
      const prefix = wall === 'izquierda' ? 'IZQ' : 'DER';
      for (let i = 1; i <= floors; i++) {
        slotsToInsert.push({
          pared: wall,
          numero_anaquel: num,
          numero_piso: i,
          codigo_slot: `${prefix}-A${num}-P${i}`
        });
      }

      const { error } = await supabase.from('anaqueles_slots').insert(slotsToInsert);
      if (error) alert("Error al crear slots: " + error.message);
      else {
        alert(`${floors} slots generados.`);
        loadShelvesMap();
      }
    });

    // POS - Cobro de venta
    document.getElementById('posSaleForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const sku = document.getElementById('posSku').value.trim();
      const qty = parseInt(document.getElementById('posQty').value);
      const price = parseFloat(document.getElementById('posPrice').value);

      const { data: variante } = await supabase.from('variantes').select('id, stock').eq('sku', sku).single();
      if (!variante) {
        alert("SKU no encontrado en inventario.");
        return;
      }

      const { error: saleErr } = await supabase.from('ventas').insert({
        variante_id: variante.id,
        cantidad: qty,
        precio_unitario: price,
        total: price * qty,
        registrado_por: profile.id
      });

      if (saleErr) alert("Error en venta: " + saleErr.message);
      else {
        await supabase.from('variantes').update({ stock: Math.max(0, variante.stock - qty) }).eq('id', variante.id);
        alert("Venta completada y stock descontado.");
        document.getElementById('posSaleForm').reset();
      }
    });

    // Bloqueo de fechas
    document.getElementById('holidayForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const inicio = document.getElementById('blockStart').value;
      const fin = document.getElementById('blockEnd').value;
      const motivo = document.getElementById('blockReason').value;

      const { error } = await supabase.from('excepciones_horarios').insert({
        fecha_inicio: new Date(inicio).toISOString(),
        fecha_fin: new Date(fin).toISOString(),
        motivo,
        registrado_por: profile.id
      });

      if (error) alert(error.message);
      else {
        alert("Fechas bloqueadas con éxito.");
        document.getElementById('holidayForm').reset();
      }
    });

    // Cortes y comprobantes
    document.getElementById('corteForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const empId = document.getElementById('corteEmpId').value;
      const empEmail = document.getElementById('corteEmpEmail').value;
      const empMarca = document.getElementById('corteEmpMarca').value;
      const monto = document.getElementById('corteMonto').value;
      const file = document.getElementById('corteFile').files[0];

      const filePath = `${empId}/${Date.now()}_${file.name}`;
      await supabase.storage.from('comprobantes').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('comprobantes').getPublicUrl(filePath);

      await supabase.from('cortes').insert({
        emprendedor_id: empId,
        monto: parseFloat(monto),
        comprobante_url: publicUrl || filePath,
        generado_por: profile.id
      });

      await notificarCorte({
        to_email: empEmail,
        nombre_marca: empMarca,
        monto,
        fecha: new Date().toLocaleDateString('es-MX'),
        comprobante_url: publicUrl || filePath
      });

      alert("Corte registrado y correo enviado.");
      document.getElementById('corteForm').reset();
    });

    // Exportación a Excel
    document.getElementById('btnExport').addEventListener('click', async () => {
      const { data: sales } = await supabase.from('ventas').select('*');
      exportToExcel(sales || [], 'Auditoria_Ventas_Haruss_Cake.xlsx');
    });
  }

  // Eventos de Emprendedor (Five Friends)
  if (role === 'emprendedor') {
    // Registrar producto y variante
    document.getElementById('addProductForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('prodName').value;
      const sku = document.getElementById('prodSku').value.trim();
      const variant = document.getElementById('prodVariant').value;
      const stock = parseInt(document.getElementById('prodStock').value);
      const salePrice = parseFloat(document.getElementById('prodSalePrice').value);
      const cost = parseFloat(document.getElementById('prodCost').value);

      const { data: prod, error: pErr } = await supabase.from('productos').insert({
        emprendedor_id: profile.id,
        nombre: name
      }).select().single();

      if (pErr) {
        alert("Error: " + pErr.message);
        return;
      }

      const { error: vErr } = await supabase.from('variantes').insert({
        producto_id: prod.id,
        sku,
        nombre_variante: variant,
        stock,
        precio_venta: salePrice,
        costo_produccion: cost
      });

      if (vErr) alert("Error variante: " + vErr.message);
      else {
        alert("Producto y variante guardados correctamente.");
        document.getElementById('addProductForm').reset();
      }
    });

    // Solicitar reserva
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

      if (!error) alert("Solicitud de reserva enviada a Betty y al equipo de Haruss Cake.");
      else alert(error.message);
    });

    // Guardar personalización
    document.getElementById('brandProfileForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const color_primario = document.getElementById('primaryColor').value;
      const color_secundario = document.getElementById('secondaryColor').value;
      const facebook_url = document.getElementById('fbUrl').value;
      const instagram_url = document.getElementById('igUrl').value;
      const whatsapp_num = document.getElementById('whaNum').value;
      const pagina_web = document.getElementById('webUrl').value;

      await supabase.from('emprendedores').update({
        color_primario, color_secundario, facebook_url, instagram_url, whatsapp_num, pagina_web
      }).eq('id', profile.id);

      applyTheme(color_primario, color_secundario);
      alert("Colores y enlaces de Five Friends guardados.");
    });
  }
};

const initApp = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      renderLogin();
      return;
    }

    const uid = session.user.id;
    // 1. Intentar cargar como staff de Haruss Cake
    const { data: harusStaff } = await supabase.from('perfiles_harus').select('*').eq('id', uid).single();

    if (harusStaff) {
      renderDashboard(harusStaff, harusStaff.rol);
      return;
    }

    // 2. Intentar cargar como emprendedor
    const { data: emp } = await supabase.from('emprendedores').select('*').eq('id', uid).single();
    if (emp) {
      renderDashboard(emp, 'emprendedor');
      return;
    }

    // 3. Fallback de sesión si el perfil fue borrado
    renderDashboard({ id: uid, nombre_marca: 'Emprendedor', nombre: 'Usuario' }, 'emprendedor');
  } catch (err) {
    console.error("Error al arrancar sesión:", err);
    renderLogin();
  }
};

initApp();
