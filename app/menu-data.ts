export type MenuCategory =
  | "Coffee"
  | "Non-Coffee"
  | "Breakfast"
  | "Sandwiches"
  | "Bites"
  | "Coffee Beans";

export type DrinkKey =
  | "latte"
  | "cortado"
  | "cappuccino"
  | "americano"
  | "espresso"
  | "drip-coffee"
  | "chicha"
  | "san-pellegrino"
  | "malta"
  | "horchata-latte"
  | "matcha"
  | "cold-brew"
  | "mocha"
  | "caramel-macchiato";

export type Product = {
  id: string;
  name: string;
  category: Exclude<MenuCategory, "Popular">;
  price: number;
  description: string;
  popular?: boolean;
  configurable?: boolean;
  visual: "hot" | "iced" | "sandwich" | "bite" | "bag";
  photo?: string;
  video?: string;
  drink?: DrinkKey;
};

export const categories: MenuCategory[] = [
  "Coffee",
  "Non-Coffee",
  "Breakfast",
  "Sandwiches",
  "Bites",
  "Coffee Beans",
];

export const menuProducts: Product[] = [
  {
    id: "ocean-blend-bag",
    name: "Ocean Blend",
    category: "Coffee Beans",
    price: 18,
    description: "12 oz medium roast whole bean coffee from El Salvador. Demo price, final price to be confirmed.",
    popular: true,
    visual: "bag",
    video: "/featured-ocean-blend.mp4",
  },
  {
    id: "latte",
    name: "Latte",
    category: "Coffee",
    price: 5.75,
    description: "Espresso with silky steamed milk, made hot or iced.",
    popular: true,
    configurable: true,
    visual: "iced",
    photo: "/drink-iced-latte.webp",
    drink: "latte",
  },
  {
    id: "cortado",
    name: "Cortado",
    category: "Coffee",
    price: 3.75,
    description: "A balanced pour of espresso and warm milk.",
    popular: true,
    configurable: true,
    visual: "iced",
    photo: "/drink-iced-cortado.webp",
    drink: "cortado",
  },
  {
    id: "americano",
    name: "Americano",
    category: "Coffee",
    price: 4.5,
    description: "Espresso opened with hot water for a clean finish.",
    configurable: true,
    visual: "iced",
    photo: "/drink-iced-americano.webp",
    drink: "americano",
  },
  {
    id: "cappuccino",
    name: "Cappuccino",
    category: "Coffee",
    price: 5.25,
    description: "Espresso, steamed milk, and a generous cap of foam.",
    configurable: true,
    visual: "iced",
    photo: "/drink-iced-cappuccino.webp",
    drink: "cappuccino",
  },
  {
    id: "espresso",
    name: "Espresso",
    category: "Coffee",
    price: 3.5,
    description: "A concentrated shot of Deaf Shark coffee.",
    configurable: true,
    visual: "iced",
    photo: "/drink-iced-espresso.webp",
    drink: "espresso",
  },
  {
    id: "regular-coffee",
    name: "Regular Coffee",
    category: "Coffee",
    price: 3,
    description: "Freshly brewed and ready for the day ahead.",
    configurable: true,
    visual: "iced",
    photo: "/drink-iced-coffee.webp",
    drink: "drip-coffee",
  },
  {
    id: "salvadoran-horchata-latte",
    name: "Salvadoran Peanut Horchata Latte",
    category: "Coffee",
    price: 6.25,
    description: "Traditional Salvadoran peanut horchata with cinnamon, topped with fresh espresso over ice.",
    popular: true,
    configurable: true,
    visual: "iced",
    photo: "/drink-salvi-horchata.webp",
    drink: "horchata-latte",
  },
  {
    id: "cold-brew",
    name: "Cold Brew",
    category: "Coffee",
    price: 4.75,
    description: "Steeped cold for 18 hours. Clean, bold, and smooth with zero bitterness.",
    popular: true,
    configurable: true,
    visual: "iced",
    photo: "/drink-cold-brew.webp",
    drink: "cold-brew",
  },
  {
    id: "caramel-macchiato",
    name: "Caramel Macchiato",
    category: "Coffee",
    price: 5.95,
    description: "Cold milk, double espresso, and rich warm caramel drizzle over ice.",
    configurable: true,
    visual: "iced",
    photo: "/drink-caramel-macchiato.webp",
    drink: "caramel-macchiato",
  },
  {
    id: "strawberry-matcha",
    name: "Strawberry Matcha",
    category: "Non-Coffee",
    price: 6.25,
    description: "Layered strawberry purée, creamy milk, and ceremonial Japanese emerald matcha over ice.",
    popular: true,
    configurable: true,
    visual: "iced",
    photo: "/drink-strawberry-matcha.webp",
    video: "/featured-strawberry-matcha.mp4",
    drink: "matcha",
  },
  {
    id: "matcha-latte",
    name: "Matcha Latte",
    category: "Non-Coffee",
    price: 5.75,
    description: "Ceremonial Japanese emerald matcha whisked with silky milk, served hot or iced.",
    popular: true,
    configurable: true,
    visual: "iced",
    photo: "/drink-matcha-latte.webp",
    drink: "matcha",
  },
  {
    id: "chicha",
    name: "Chicha",
    category: "Non-Coffee",
    price: 4.75,
    description: "Rice-based coconut drink with condensed milk and vanilla.",
    popular: true,
    visual: "iced",
    photo: "/drink-chicha.webp",
    drink: "chicha",
  },
  {
    id: "san-pellegrino",
    name: "San Pellegrino",
    category: "Non-Coffee",
    price: 3.5,
    description: "Sparkling refreshment served chilled.",
    visual: "iced",
    photo: "/drink-san-pellegrino.webp",
    drink: "san-pellegrino",
  },
  {
    id: "malta",
    name: "Malta",
    category: "Non-Coffee",
    price: 2.5,
    description: "A classic chilled malt beverage.",
    visual: "iced",
    photo: "/drink-malta.webp",
    drink: "malta",
  },
  {
    id: "artisan-breakfast",
    name: "Artisan Breakfast",
    category: "Breakfast",
    price: 7,
    description: "A warm, satisfying breakfast made for busy mornings.",
    visual: "sandwich",
    photo: "/food-artisan-breakfast.jpg",
  },
  {
    id: "breakfast-croissant",
    name: "Breakfast Croissant",
    category: "Breakfast",
    price: 6.75,
    description: "A flaky croissant layered with a savory breakfast filling.",
    popular: true,
    visual: "sandwich",
    photo: "/food-breakfast-croissant.jpg",
  },
  {
    id: "maple-waffle",
    name: "Maple Waffle",
    category: "Breakfast",
    price: 6.75,
    description: "Warm waffle with a sweet maple finish.",
    visual: "bite",
    photo: "/food-maple-waffle.jpg",
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
    photo: "/food-shark-cubano.jpg",
  },
  {
    id: "chicken-sandwich",
    name: "Chicken Sandwich",
    category: "Sandwiches",
    price: 6,
    description: "Pressed panini with chicken, Swiss, ham, lettuce, pickles, and mustard.",
    configurable: true,
    visual: "sandwich",
    photo: "/food-chicken-sandwich.jpg",
  },
  {
    id: "emilia",
    name: "Emilia",
    category: "Sandwiches",
    price: 6,
    description: "Mortadella, provolone, and honey in a pressed sandwich.",
    configurable: true,
    visual: "sandwich",
    photo: "/food-emilia.jpg",
  },
  {
    id: "turkey-pesto",
    name: "Turkey Pesto",
    category: "Sandwiches",
    price: 7.25,
    description: "Ciabatta, turkey pesto, Swiss, lettuce, and tomato.",
    configurable: true,
    visual: "sandwich",
    photo: "/food-turkey-pesto.jpg",
  },
  {
    id: "chicken-pesto",
    name: "Chicken Pesto",
    category: "Sandwiches",
    price: 7.75,
    description: "Grilled chicken, melted cheese, tomato, and basil pesto on toasted artisan bread.",
    popular: true,
    visual: "sandwich",
    photo: "/chicken-pesto-centered.jpg",
    video: "/featured-chicken-pesto.mp4",
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
    photo: "/food-la-toscana.jpg",
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
    photo: "/food-cachapa.jpg",
  },
  {
    id: "tequenos",
    name: "Four Tequeños",
    category: "Bites",
    price: 5.99,
    description: "Golden pastry sticks filled with cheese.",
    popular: true,
    visual: "bite",
    photo: "/food-tequenos.jpg",
  },
  {
    id: "cachitos",
    name: "Cachitos",
    category: "Bites",
    price: 6.99,
    description: "Soft pastry stuffed with ham, cheese, and bacon.",
    visual: "bite",
    photo: "/food-cachitos.jpg",
  },
  {
    id: "fries",
    name: "French Fries",
    category: "Bites",
    price: 3.99,
    description: "Crisp, golden, and ready to share.",
    visual: "bite",
    photo: "/food-fries.jpg",
  },
];

export const featuredProducts = [
  menuProducts.find((product) => product.id === "strawberry-matcha")!,
  menuProducts.find((product) => product.id === "ocean-blend-bag")!,
  menuProducts.find((product) => product.id === "chicken-pesto")!,
];
