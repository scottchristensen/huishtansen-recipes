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
  notes: string;
  remix_of: string | null;
  remix_label: string;
  created_at?: string;
  updated_at?: string;
  // Loaded separately from recipe_photos table
  attemptPhotos?: string[];
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
