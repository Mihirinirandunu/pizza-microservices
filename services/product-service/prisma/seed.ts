import { PrismaClient, PizzaSize } from '@prisma/client';

const prisma = new PrismaClient();

const INITIAL_PIZZAS = [
  {
    name: 'Margherita Classica',
    description:
      'San Marzano crushed tomatoes, fresh fior di latte mozzarella, sweet basil, and cold-pressed olive oil.',
    imageUrl:
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=80',
    category: 'Classic',
    variants: [
      { size: PizzaSize.MEDIUM, price: 12.5, stock: 12 },
      { size: PizzaSize.LARGE, price: 16.0, stock: 10 },
      { size: PizzaSize.XL, price: 19.5, stock: 6 },
    ],
  },
  {
    name: 'Pepperoni Feast',
    description:
      'Double crispy cup-and-char pepperoni, aged provolone, mozzarella, and wild mountain oregano.',
    imageUrl:
      'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=900&q=80',
    category: 'Meat',
    variants: [
      { size: PizzaSize.MEDIUM, price: 14.0, stock: 15 },
      { size: PizzaSize.LARGE, price: 18.0, stock: 8 },
      { size: PizzaSize.XL, price: 22.0, stock: 5 },
    ],
  },
  {
    name: 'Quattro Formaggi',
    description:
      'Rich four-cheese blend of mozzarella, creamy gorgonzola, fontina, and aged Parmigiano-Reggiano.',
    imageUrl:
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80',
    category: 'Vegetarian',
    variants: [
      { size: PizzaSize.MEDIUM, price: 13.5, stock: 9 },
      { size: PizzaSize.LARGE, price: 17.5, stock: 7 },
      { size: PizzaSize.XL, price: 21.0, stock: 4 },
    ],
  },
  {
    name: 'Truffle Wild Mushroom',
    description:
      'Roasted cremini and shiitake mushrooms, caramelized onions, thyme, garlic cream, and white truffle drizzle.',
    imageUrl:
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80',
    category: 'Gourmet',
    variants: [
      { size: PizzaSize.MEDIUM, price: 15.0, stock: 8 },
      { size: PizzaSize.LARGE, price: 19.0, stock: 6 },
      { size: PizzaSize.XL, price: 23.0, stock: 4 },
    ],
  },
  {
    name: 'Smoky BBQ Chicken',
    description:
      'Char-grilled chicken breast, smoky hickory BBQ sauce, red onion rings, smoked gouda, and fresh cilantro.',
    imageUrl:
      'https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?auto=format&fit=crop&w=900&q=80',
    category: 'Specialty',
    variants: [
      { size: PizzaSize.MEDIUM, price: 14.5, stock: 10 },
      { size: PizzaSize.LARGE, price: 18.5, stock: 9 },
      { size: PizzaSize.XL, price: 22.5, stock: 5 },
    ],
  },
];

export async function seedProducts(client: PrismaClient = prisma): Promise<void> {
  for (const pizza of INITIAL_PIZZAS) {
    const existing = await client.pizza.findUnique({
      where: { name: pizza.name },
    });
    if (existing) {
      continue;
    }

    await client.pizza.create({
      data: {
        name: pizza.name,
        description: pizza.description,
        imageUrl: pizza.imageUrl,
        category: pizza.category,
        variants: {
          create: pizza.variants,
        },
      },
    });
  }
}

if (require.main === module) {
  seedProducts()
    .then(() => {
      console.log('Product seed completed');
      return prisma.$disconnect();
    })
    .catch(async (err) => {
      console.error('Product seed failed:', err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
