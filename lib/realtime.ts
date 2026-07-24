// Nom de canal Realtime garanti unique dans le process.
//
// `supabase.channel(topic)` renvoie le canal EXISTANT si le topic est déjà
// pris. Lui rattacher un `.on('postgres_changes', …)` alors qu'il est déjà
// souscrit lève :
//   « cannot add postgres_changes callbacks after subscribe() »
//
// Un suffixe Date.now() ne suffit pas : un double montage React (StrictMode)
// est synchrone, donc les deux appels tombent dans la même milliseconde et
// se retrouvent sur le même topic. Un compteur, lui, ne collisionne jamais.
let seq = 0;

export function uniqueChannelName(prefix: string): string {
  seq += 1;
  return `${prefix}:${seq}`;
}
