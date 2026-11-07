import { supabase } from '../config/supabaseClient.js';

export const renderShelvesConfig = async (container) => {
  const { data: slots, error } = await supabase.from('anaqueles_slots').select('*');
  if (error) {
    container.innerHTML = `<p>Error al cargar anaqueles.</p>`;
    return;
  }

  const leftSlots = (slots || []).filter(s => s.pared === 'izquierda');
  const rightSlots = (slots || []).filter(s => s.pared === 'derecha');

  const renderSide = (title, items) => `
    <div class="wall-column">
      <h4>${title}</h4>
      <div class="shelf-box">
        <div class="slot-grid">
          ${items.length === 0 ? '<p style="font-size:12px;">Sin slots configurados</p>' : items.map(slot => `
            <div class="slot-cell ${slot.emprendedor_id ? 'slot-occupied' : ''}">
              ${slot.codigo_slot}<br>
              <small>${slot.emprendedor_id ? 'Ocupado' : 'Libre'}</small>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = `
    <h4>Mapa Visual de Anaqueles (Haruss Cake)</h4>
    <div class="showroom-layout">
      ${renderSide('Pared Izquierda', leftSlots)}
      ${renderSide('Pared Derecha', rightSlots)}
    </div>
  `;
};
