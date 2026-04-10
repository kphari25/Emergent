// WhatsApp click-to-chat utility for Tatva Ayurved

const HOSPITAL_NAME = 'Tatva Ayurved Hospital';
const HOSPITAL_PHONE = '+91 9895112264';

/**
 * Format phone number to international WhatsApp format (91XXXXXXXXXX)
 */
export function formatPhoneForWhatsApp(phone) {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  if (cleaned.length === 10) return `91${cleaned}`;
  if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned;
  if (cleaned.startsWith('0') && cleaned.length === 11) return `91${cleaned.slice(1)}`;
  return cleaned;
}

/**
 * Generate a WhatsApp click-to-chat URL
 */
export function getWhatsAppLink(phone, message) {
  const formatted = formatPhoneForWhatsApp(phone);
  if (!formatted) return null;
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
}

/**
 * Open WhatsApp in a new tab
 */
export function openWhatsApp(phone, message) {
  const link = getWhatsAppLink(phone, message);
  if (link) {
    window.open(link, '_blank', 'noopener,noreferrer');
  }
}

// ==================== MESSAGE TEMPLATES ====================

export function appointmentReminderMsg(patientName, date, time, treatment, doctorName) {
  return `Dear ${patientName},\n\nThis is a reminder from *${HOSPITAL_NAME}*.\n\nYour appointment is scheduled:\nDate: ${date}\nTime: ${time}${treatment ? `\nTreatment: ${treatment}` : ''}${doctorName ? `\nDoctor: ${doctorName}` : ''}\n\nPlease arrive 15 minutes early. Carry your previous prescriptions if any.\n\nFor queries, contact: ${HOSPITAL_PHONE}\n\nThank you,\n${HOSPITAL_NAME}`;
}

export function therapyReminderMsg(patientName, therapyName, date, time, duration) {
  return `Dear ${patientName},\n\nThis is a reminder from *${HOSPITAL_NAME}*.\n\nYour therapy session is scheduled:\nTherapy: ${therapyName}\nDate: ${date}\nTime: ${time}\nDuration: ${duration} minutes\n\nPlease arrive on time and wear comfortable clothing.\n\nFor queries, contact: ${HOSPITAL_PHONE}\n\nThank you,\n${HOSPITAL_NAME}`;
}

export function followUpReminderMsg(patientName, lastVisitDate) {
  return `Dear ${patientName},\n\nGreetings from *${HOSPITAL_NAME}*!\n\nIt's been a while since your last visit${lastVisitDate ? ` on ${lastVisitDate}` : ''}. We recommend scheduling a follow-up consultation to monitor your progress.\n\nPlease call us at ${HOSPITAL_PHONE} or visit to book your appointment.\n\nWishing you good health,\n${HOSPITAL_NAME}`;
}

export function postDischargeDietMsg(patientName, diagnosis) {
  return `Dear ${patientName},\n\nGreetings from *${HOSPITAL_NAME}*!\n\nAs part of your post-discharge care${diagnosis ? ` for ${diagnosis}` : ''}, please follow these Ayurvedic diet guidelines:\n\n- Eat warm, freshly cooked meals\n- Avoid cold, raw, and processed foods\n- Drink warm water throughout the day\n- Include easily digestible foods (khichdi, soups, steamed vegetables)\n- Avoid heavy meals after sunset\n- Take prescribed medicines on time\n\nFor any discomfort or queries, contact us at ${HOSPITAL_PHONE}.\n\nWishing you a speedy recovery,\n${HOSPITAL_NAME}`;
}

export function medicineRefillMsg(patientName, medicines) {
  const medList = medicines && medicines.length > 0 
    ? medicines.map(m => `- ${m}`).join('\n') 
    : '- Your prescribed medicines';
  return `Dear ${patientName},\n\nGreetings from *${HOSPITAL_NAME}*!\n\nThis is a friendly reminder that your medicines may be due for a refill:\n\n${medList}\n\nPlease visit our pharmacy or call us at ${HOSPITAL_PHONE} to order your refill.\n\nStay healthy,\n${HOSPITAL_NAME}`;
}

export function generalMsg(patientName) {
  return `Dear ${patientName},\n\nGreetings from *${HOSPITAL_NAME}*!\n\n`;
}
