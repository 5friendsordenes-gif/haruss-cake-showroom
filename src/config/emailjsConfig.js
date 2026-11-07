import emailjs from 'emailjs-com';

// Credenciales y plantillas configuradas
export const EMAILJS_CONFIG = {
  SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID || '', // Se lee desde .env o Vercel
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
    const serviceId = EMAILJS_CONFIG.SERVICE_ID;
    if (!serviceId) {
      console.warn("EmailJS: No se ha definido VITE_EMAILJS_SERVICE_ID en las variables de entorno.");
      return null;
    }
    const response = await emailjs.send(
      serviceId,
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
 * Disparador específico: Notificación de Corte / Depósito con comprobante
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
 * Disparador específico: Entrada o Retiro físico de mercancía
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
