export type Manufacturer = {
  code: string;
  name: string;
};

export type Filiale = {
  id?: number;
  name: string;
};

export type ChargeAffaire = {
  id?: number;
  filiale_id: number;
  name: string;
};

export type ComponentRef = {
  ref: string;
  designation: string;
  fabCode: string;
  weight?: number;
};

export type Project = {
  id: string; // N° Affaire (ou Affaire origine si c'est la même chose)
  techName: string; // Technicien BE
  createdAt: string;
  filialeOrigine?: string;
  affaireOrigine?: string;
  ligneOrigine?: string;
  filialeExecutant?: string;
  affaireExecutant?: string;
  ligneExecutant?: string;
  affaireUF?: string;
  ligneUF?: string;
  client?: string;
  nomAffaire?: string;
  nomTableau?: string;
  chargeAffaire?: string;
  isSousTraitance?: boolean;
  isUF?: boolean;
};

export type SublistType = 'fiche_achat' | 'appro_anticipe';

export type Sublist = {
  id: string;
  projectId: string;
  name: string;
  type: SublistType;
};

export type Category = 'Canevas' | 'U.F.' | 'Autre' | 'Tôlerie' | 'Électronique';

export type BOMLine = {
  id: string;
  projectId: string;
  sublistId: string;
  ref: string;
  quantity: number;
  location?: string;
  // deprecated/kept for backwards compat if needed, but not primarily used for view logic anymore
  category?: Category;
};
