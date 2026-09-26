// Machine d'états de l'enchaînement : chaque état déclare les états qu'il peut rejoindre.
// Une transition absente de la table est un bug d'enchaînement (course entre deux animations, par exemple).

export type FlowState =
  | 'loading'    // polices et planches en préparation
  | 'idle'       // pochette présentée, prête à être déchirée
  | 'tearing'    // déchirure en cours (doigt ou automatique)
  | 'opening'    // les planches sortent de la pochette
  | 'reveal'     // révélation des planches 1 à 4
  | 'walkout'    // séquence finale de la 5e planche
  | 'hero'       // la planche la plus rare est présentée
  | 'transition' // passage animé entre deux écrans
  | 'summary'    // récapitulatif des 5 planches
  | 'inspect'    // fiche d'une planche
  | 'gallery'    // galerie de débogage (CDC.gallery)
  | 'atlas'      // Atlas céleste : la collection sur la sphère céleste
  | 'atlasPlate'; // une planche examinée depuis l'Atlas (ou ouverte par un lien direct)

export const TRANSITIONS: Readonly<Record<FlowState, readonly FlowState[]>> = {
  loading: ['idle', 'gallery', 'atlas', 'atlasPlate'],
  idle: ['tearing', 'gallery', 'atlas'],
  tearing: ['opening'],
  opening: ['reveal'],
  reveal: ['walkout'],
  walkout: ['hero'],
  hero: ['transition'],
  transition: ['summary', 'idle'],
  summary: ['inspect', 'transition', 'atlas'],
  inspect: ['summary'],
  gallery: [],
  atlas: ['atlasPlate', 'transition'],
  atlasPlate: ['atlas'],
};

export function canGo(from: FlowState, to: FlowState): boolean {
  return TRANSITIONS[from].includes(to);
}

export class IllegalTransition extends Error {
  constructor(public from: FlowState, public to: FlowState) {
    super(`Transition inattendue : ${from} → ${to}`);
  }
}
