import emailjs from 'emailjs-com';

// Credenciales oficiales de EmailJS para Haruss Cake
export const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_1y0tgd4',
  PUBLIC_KEY: 'bQovyKh5HgjqtawTn',
  TEMPLATES: {
    CORTE: 'template_u4xacfp',
    INVENTARIO: 'template_7c2m0md'
  }
};

/**
 * Función genérica de envío con EmailJS
 */
export const sendNotification = async (templateId, templateParams) => {
  try {
    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      templateId,
      templateParams,
      EMAILJS_CONFIG.PUBLIC_KEY
    );
    console.log("Correo enviado con éxito:", response.status, response.text);
    return response;
  } catch (error) {
    console.error("Error al enviar notificación por correo:", error);
    return null;
  }
};

/**
 * Notificación automática de Corte / Depósito con comprobante
 */
export const notificarCorte = async ({ to_email, nombre_marca, monto, fecha, comprobante_url }) => {
  return await sendNotification(EMAILJS_CONFIG.TEMPLATES.CORTE, {
    to_email,
    nombre_marca,
    monto,
    fecha,
    comprobante_url
  });
};

/**
 * Notificación automática de Entrada o Retiro físico de mercancía
 */
export const notificarMovimientoInventario = async ({ to_email, nombre_marca, tipo_movimiento, sku_producto, cantidad, autorizado_por }) => {
  return await sendNotification(EMAILJS_CONFIG.TEMPLATES.INVENTARIO, {
    to_email,
    nombre_marca,
    tipo_movimiento,
    sku_producto,
    cantidad,
    autorizado_por
  });
};
