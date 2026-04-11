export interface Recipe {
  id: string;
  name: string;
  type: string;
  chef: string;
  difficulty: "Easy" | "Medium" | "Hard";
  time: string;
  servings: string;
  photo: string;
  instructions: string;
  ingredients: string;
  link: string;
  tags: string[];
  status: "family-approved" | "want-to-try";
  attemptPhotos?: string[];
  notes?: string;
  remixOf?: string;
  remixLabel?: string;
}

export interface HealthySuggestion {
  original: string;
  substitute: string;
  reason: string;
}

export type FilterState = {
  search: string;
  chef: string;
  type: string;
  difficulty: string;
  status: string;
  maxTime: string;
};
