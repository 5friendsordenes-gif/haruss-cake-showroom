import emailjs from 'emailjs-com';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export const sendNotification = async (templateId, templateParams) => {
  if (!SERVICE_ID || !PUBLIC_KEY) return null;
  try {
    return await emailjs.send(SERVICE_ID, templateId, templateParams, PUBLIC_KEY);
  } catch (error) {
    console.error("Error al enviar notificación:", error);
    return null;
  }
};
