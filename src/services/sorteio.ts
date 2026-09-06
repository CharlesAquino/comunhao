/**
 * Algoritmo de sorteio do Círculo de Oração.
 * Cria pares circulares a partir de uma lista de IDs embaralhada.
 * Cada usuário ora por um (orando_por_id) e é orado por outro (sendo_orado_por_id).
 */
export function executarSorteio(ids: string[]): Array<{
  id: string;
  orando_por_id: string;
  sendo_orado_por_id: string;
}> {
  if (ids.length < 2) {
    throw new Error(`Mínimo de 2 participantes para o sorteio (recebido: ${ids.length})`);
  }

  const shuffled = [...ids];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const total = shuffled.length;
  return shuffled.map((id, i) => ({
    id,
    orando_por_id: shuffled[(i + 1) % total],
    sendo_orado_por_id: shuffled[(i - 1 + total) % total],
  }));
}
