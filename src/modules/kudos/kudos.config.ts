// Mapa de puntajes por categoría
export const KUDOS_SCORES: Record<string, number> = {
  'TEAMWORK': 2.0,
  'CLIENT_FOCUS': 2.5,
  'RESULTS': 3.0,
  'INNOVATION': 3.5,
  'LEADERSHIP': 4.0
};

// Función auxiliar para calcular puntaje
export const getScore = (categoryCode: string): number => {
  return KUDOS_SCORES[categoryCode] || 1.0; // Default 1 punto si no existe
};