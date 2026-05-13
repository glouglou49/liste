export type Manufacturer = {
  code: string;
  name: string;
};

export type ComponentRef = {
  ref: string;
  designation: string;
  fabCode: string;
  weight?: number;
};

export type Project = {
  id: string; // N° Affaire
  techName: string; // Technicien BE
  createdAt: string;
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
