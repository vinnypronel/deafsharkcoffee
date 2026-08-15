export type MenuCategory =
  | "Popular"
  | "Coffee"
  | "Non-Coffee"
  | "Breakfast"
  | "Sandwiches"
  | "Bites";

export type Product = {
  id: string;
  name: string;
  category: Exclude<MenuCategory, "Popular">;
  price: number;
  description: string;
  popular?: boolean;
  configurable?: boolean;
  visual: "hot" | "iced" | "sandwich" | "bite" | "bag";
};

export const categories: MenuCategory[] = [
  "Popular",
  "Coffee",
  "Non-Coffee",
  "Breakfast",
  "Sandwiches",
  "Bites",
];

export const menuProducts: Product[] = [
  {
    id: "latte",
    name: "Latte",
    category: "Coffee",
    price: 5.75,
    description: "Espresso with silky steamed milk, made hot or iced.",
    popular: true,
    configurable: true,
    visual: "hot",
  },
  {
    id: "cortado",
    name: "Cortado",
    category: "Coffee",
    price: 3.75,
    description: "A balanced pour of espresso and warm milk.",
    popular: true,
    configurable: true,
    visual: "hot",
  },
  {
    id: "cappuccino",
    name: "Cappuccino",
    category: "Coffee",
    price: 5.25,
    description: "Espresso, steamed milk, and a generous cap of foam.",
    configurable: true,
    visual: "hot",
  },
  {
    id: "americano",
    name: "Americano",
    category: "Coffee",
    price: 4.5,
    description: "Espresso opened with hot water for a clean finish.",
    configurable: true,
    visual: "hot",
  },
  {
    id: "espresso",
    name: "Espresso",
    category: "Coffee",
    price: 3.5,
    description: "A concentrated shot of Deaf Shark coffee.",
    configurable: true,
    visual: "hot",
  },
  {
    id: "regular-coffee",
    name: "Regular Coffee",
    category: "Coffee",
    price: 3,
    description: "Freshly brewed and ready for the day ahead.",
    configurable: true,
    visual: "hot",
  },
  {
    id: "chicha",
    name: "Chicha",
    category: "Non-Coffee",
    price: 4.75,
    description: "Rice-based coconut drink with condensed milk and vanilla.",
    popular: true,
    visual: "iced",
  },
  {
    id: "san-pellegrino",
    name: "San Pellegrino",
    category: "Non-Coffee",
    price: 3.5,
    description: "Sparkling refreshment served chilled.",
    visual: "iced",
  },
  {
    id: "malta",
    name: "Malta",
    category: "Non-Coffee",
    price: 2.5,
    description: "A classic chilled malt beverage.",
    visual: "iced",
  },
  {
    id: "artisan-breakfast",
    name: "Artisan Breakfast",
    category: "Breakfast",
    price: 7,
    description: "A warm, satisfying breakfast made for busy mornings.",
    visual: "sandwich",
  },
  {
    id: "breakfast-croissant",
    name: "Breakfast Croissant",
    category: "Breakfast",
    price: 6.75,
    description: "A flaky croissant layered with a savory breakfast filling.",
    popular: true,
    visual: "sandwich",
  },
  {
    id: "maple-waffle",
    name: "Maple Waffle",
    category: "Breakfast",
    price: 6.75,
    description: "Warm waffle with a sweet maple finish.",
    visual: "bite",
  },
  {
    id: "shark-cubano",
    name: "The Shark Cubano",
    category: "Sandwiches",
    price: 6,
    description: "Pressed panini with pork, Swiss, ham, lettuce, pickles, and mustard.",
    popular: true,
    configurable: true,
    visual: "sandwich",
  },
  {
    id: "chicken-sandwich",
    name: "Chicken Sandwich",
    category: "Sandwiches",
    price: 6,
    description: "Pressed panini with chicken, Swiss, ham, lettuce, pickles, and mustard.",
    configurable: true,
    visual: "sandwich",
  },
  {
    id: "emilia",
    name: "Emilia",
    category: "Sandwiches",
    price: 6,
    description: "Mortadella, provolone, and honey in a pressed sandwich.",
    configurable: true,
    visual: "sandwich",
  },
  {
    id: "turkey-pesto",
    name: "Turkey Pesto",
    category: "Sandwiches",
    price: 7.25,
    description: "Ciabatta, turkey pesto, Swiss, lettuce, and tomato.",
    configurable: true,
    visual: "sandwich",
  },
  {
    id: "chicken-pesto",
    name: "Chicken Pesto",
    category: "Sandwiches",
    price: 7.75,
    description: "Ciabatta, chicken pesto, provolone, tomato, and lettuce.",
    configurable: true,
    visual: "sandwich",
  },
  {
    id: "la-toscana",
    name: "La Toscana",
    category: "Sandwiches",
    price: 9.75,
    description: "Mortadella, burrata, pesto, arugula, roasted peppers, and olive oil.",
    popular: true,
    configurable: true,
    visual: "sandwich",
  },
  {
    id: "cachapa",
    name: "Cachapa",
    category: "Bites",
    price: 9.5,
    description: "Sweet corn pancake filled with cheese.",
    popular: true,
    configurable: true,
    visual: "bite",
  },
  {
    id: "tequenos",
    name: "Four Tequeños",
    category: "Bites",
    price: 5.99,
    description: "Golden pastry sticks filled with cheese.",
    popular: true,
    visual: "bite",
  },
  {
    id: "cachitos",
    name: "Cachitos",
    category: "Bites",
    price: 6.99,
    description: "Soft pastry stuffed with ham, cheese, and bacon.",
    visual: "bite",
  },
  {
    id: "fries",
    name: "French Fries",
    category: "Bites",
    price: 3.99,
    description: "Crisp, golden, and ready to share.",
    visual: "bite",
  },
];

export const featuredProducts = [
  menuProducts.find((product) => product.id === "latte")!,
  menuProducts.find((product) => product.id === "shark-cubano")!,
  menuProducts.find((product) => product.id === "cachapa")!,
];

