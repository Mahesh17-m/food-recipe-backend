const mongoose = require('mongoose');
require('dotenv').config();

// Use your existing Recipe model
const Recipe = require('./models/Recipe'); // Adjust path as needed

// Sample recipe data matching your schema
const sampleRecipes = [
  // Breakfast Recipes
  {
    title: "Fluffy Pancakes",
    description: "Light and fluffy pancakes perfect for weekend breakfast",
    ingredients: [
      { name: "all-purpose flour", amount: "2 cups" },
      { name: "sugar", amount: "2 tbsp" },
      { name: "baking powder", amount: "2 tsp" },
      { name: "salt", amount: "1 tsp" },
      { name: "eggs", amount: "2 large" },
      { name: "milk", amount: "1 3/4 cups" },
      { name: "melted butter", amount: "1/4 cup" }
    ],
    instructions: [
      { text: "Mix dry ingredients in a large bowl" },
      { text: "In another bowl, beat eggs and milk together" },
      { text: "Combine wet and dry ingredients, stir until just mixed" },
      { text: "Heat griddle and pour batter to form pancakes" },
      { text: "Cook until bubbles form, then flip and cook until golden brown" }
    ],
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    difficulty: "Easy",
    category: "Breakfast",
    nutrition: {
      calories: 250,
      carbs: 35,
      protein: 8,
      fat: 9
    }
  },
  {
    title: "Avocado Toast",
    description: "Healthy and delicious avocado toast with poached eggs",
    ingredients: [
      { name: "bread slices", amount: "2 slices" },
      { name: "ripe avocado", amount: "1 large" },
      { name: "eggs", amount: "2 large" },
      { name: "salt", amount: "to taste" },
      { name: "black pepper", amount: "to taste" },
      { name: "red pepper flakes", amount: "1/2 tsp" },
      { name: "lemon juice", amount: "1 tbsp" }
    ],
    instructions: [
      { text: "Toast bread slices until golden and crispy" },
      { text: "Mash avocado with lemon juice, salt and pepper" },
      { text: "Poach eggs in simmering water for 3-4 minutes" },
      { text: "Spread avocado mixture evenly on toast" },
      { text: "Top with poached eggs and sprinkle with red pepper flakes" }
    ],
    prepTime: 5,
    cookTime: 10,
    servings: 2,
    difficulty: "Easy",
    category: "Breakfast",
    nutrition: {
      calories: 320,
      carbs: 25,
      protein: 15,
      fat: 18
    }
  },
  {
    title: "Classic Omelette",
    description: "Perfect fluffy omelette with cheese and fresh herbs",
    ingredients: [
      { name: "eggs", amount: "3 large" },
      { name: "milk", amount: "2 tbsp" },
      { name: "shredded cheese", amount: "1/4 cup" },
      { name: "butter", amount: "1 tbsp" },
      { name: "salt", amount: "1/4 tsp" },
      { name: "black pepper", amount: "1/8 tsp" },
      { name: "fresh chives", amount: "1 tbsp chopped" }
    ],
    instructions: [
      { text: "Beat eggs with milk, salt and pepper until frothy" },
      { text: "Melt butter in non-stick pan over medium heat" },
      { text: "Pour egg mixture into the pan" },
      { text: "When edges set, add cheese to one half" },
      { text: "Fold omelette in half and cook for 1 more minute" }
    ],
    prepTime: 5,
    cookTime: 8,
    servings: 1,
    difficulty: "Easy",
    category: "Breakfast",
    nutrition: {
      calories: 280,
      carbs: 3,
      protein: 20,
      fat: 21
    }
  },

  // Lunch Recipes
  {
    title: "Chicken Caesar Salad",
    description: "Classic Caesar salad with grilled chicken breast",
    ingredients: [
      { name: "chicken breasts", amount: "2 medium" },
      { name: "romaine lettuce", amount: "1 head" },
      { name: "Parmesan cheese", amount: "1/2 cup grated" },
      { name: "croutons", amount: "1 cup" },
      { name: "Caesar dressing", amount: "1/4 cup" },
      { name: "lemon juice", amount: "1 tbsp" },
      { name: "black pepper", amount: "to taste" }
    ],
    instructions: [
      { text: "Grill chicken breasts until fully cooked, then slice" },
      { text: "Chop romaine lettuce into bite-sized pieces" },
      { text: "In a large bowl, combine lettuce with most of the Parmesan" },
      { text: "Add sliced chicken and croutons" },
      { text: "Toss with Caesar dressing and lemon juice, garnish with remaining Parmesan" }
    ],
    prepTime: 15,
    cookTime: 12,
    servings: 2,
    difficulty: "Easy",
    category: "Lunch",
    nutrition: {
      calories: 380,
      carbs: 12,
      protein: 35,
      fat: 22
    }
  },
  {
    title: "Vegetable Stir Fry",
    description: "Quick and healthy vegetable stir fry with Asian flavors",
    ingredients: [
      { name: "mixed vegetables", amount: "4 cups" },
      { name: "soy sauce", amount: "2 tbsp" },
      { name: "fresh ginger", amount: "1 tbsp grated" },
      { name: "garlic", amount: "2 cloves minced" },
      { name: "vegetable oil", amount: "1 tbsp" },
      { name: "sesame oil", amount: "1 tsp" },
      { name: "sesame seeds", amount: "1 tbsp" }
    ],
    instructions: [
      { text: "Heat oils in a wok or large pan over high heat" },
      { text: "Add ginger and garlic, stir for 30 seconds" },
      { text: "Add mixed vegetables and stir fry for 5-6 minutes" },
      { text: "Add soy sauce and continue cooking for 2 minutes" },
      { text: "Garnish with sesame seeds before serving" }
    ],
    prepTime: 10,
    cookTime: 10,
    servings: 2,
    difficulty: "Easy",
    category: "Lunch",
    nutrition: {
      calories: 180,
      carbs: 22,
      protein: 6,
      fat: 8
    }
  },
  {
    title: "Quinoa Power Bowl",
    description: "Nutritious quinoa bowl with roasted vegetables and lemon dressing",
    ingredients: [
      { name: "quinoa", amount: "1 cup" },
      { name: "mixed vegetables", amount: "3 cups" },
      { name: "olive oil", amount: "2 tbsp" },
      { name: "lemon juice", amount: "2 tbsp" },
      { name: "feta cheese", amount: "1/2 cup crumbled" },
      { name: "fresh parsley", amount: "2 tbsp chopped" },
      { name: "salt and pepper", amount: "to taste" }
    ],
    instructions: [
      { text: "Cook quinoa according to package instructions" },
      { text: "Roast vegetables with olive oil at 400°F for 20 minutes" },
      { text: "Whisk together lemon juice, olive oil, salt and pepper for dressing" },
      { text: "Combine quinoa and roasted vegetables in bowls" },
      { text: "Top with feta cheese, parsley and drizzle with dressing" }
    ],
    prepTime: 15,
    cookTime: 20,
    servings: 2,
    difficulty: "Medium",
    category: "Lunch",
    nutrition: {
      calories: 320,
      carbs: 45,
      protein: 12,
      fat: 14
    }
  },

  // Dinner Recipes
  {
    title: "Spaghetti Carbonara",
    description: "Creamy Italian pasta dish with pancetta and eggs",
    ingredients: [
      { name: "spaghetti", amount: "200g" },
      { name: "pancetta", amount: "100g diced" },
      { name: "eggs", amount: "2 large" },
      { name: "Parmesan cheese", amount: "50g grated" },
      { name: "black pepper", amount: "1 tsp freshly ground" },
      { name: "salt", amount: "to taste" },
      { name: "garlic", amount: "1 clove minced" }
    ],
    instructions: [
      { text: "Cook spaghetti in salted water until al dente" },
      { text: "Fry pancetta until crispy, add garlic at the end" },
      { text: "Whisk eggs with most of the Parmesan and black pepper" },
      { text: "Combine hot pasta with pancetta, then quickly mix in egg mixture" },
      { text: "Serve immediately with remaining Parmesan" }
    ],
    prepTime: 10,
    cookTime: 15,
    servings: 2,
    difficulty: "Medium",
    category: "Dinner",
    nutrition: {
      calories: 520,
      carbs: 65,
      protein: 25,
      fat: 18
    }
  },
  {
    title: "Grilled Salmon",
    description: "Perfectly grilled salmon with lemon and fresh herbs",
    ingredients: [
      { name: "salmon fillets", amount: "2 pieces" },
      { name: "lemon juice", amount: "2 tbsp" },
      { name: "fresh dill", amount: "2 tbsp chopped" },
      { name: "olive oil", amount: "1 tbsp" },
      { name: "salt", amount: "1/2 tsp" },
      { name: "black pepper", amount: "1/4 tsp" },
      { name: "garlic", amount: "1 clove minced" }
    ],
    instructions: [
      { text: "Season salmon with salt, pepper and garlic" },
      { text: "Preheat grill to medium-high heat" },
      { text: "Grill salmon for 4-5 minutes per side" },
      { text: "Drizzle with lemon juice during last minute of cooking" },
      { text: "Garnish with fresh dill before serving" }
    ],
    prepTime: 5,
    cookTime: 10,
    servings: 2,
    difficulty: "Easy",
    category: "Dinner",
    nutrition: {
      calories: 280,
      carbs: 2,
      protein: 34,
      fat: 15
    }
  },
  {
    title: "Beef Tacos",
    description: "Flavorful beef tacos with fresh toppings and spices",
    ingredients: [
      { name: "ground beef", amount: "500g" },
      { name: "taco shells", amount: "8 shells" },
      { name: "lettuce", amount: "2 cups shredded" },
      { name: "tomato", amount: "1 large diced" },
      { name: "cheddar cheese", amount: "1 cup shredded" },
      { name: "sour cream", amount: "1/2 cup" },
      { name: "taco seasoning", amount: "2 tbsp" }
    ],
    instructions: [
      { text: "Brown ground beef in a large pan, drain excess fat" },
      { text: "Add taco seasoning and water, simmer for 10 minutes" },
      { text: "Warm taco shells according to package instructions" },
      { text: "Prepare all toppings: shred lettuce, dice tomato, grate cheese" },
      { text: "Assemble tacos with beef and desired toppings" }
    ],
    prepTime: 15,
    cookTime: 15,
    servings: 4,
    difficulty: "Easy",
    category: "Dinner",
    nutrition: {
      calories: 380,
      carbs: 22,
      protein: 28,
      fat: 20
    }
  },

  // Dessert Recipes
  {
    title: "Chocolate Brownies",
    description: "Rich and fudgy chocolate brownies with crispy top",
    ingredients: [
      { name: "dark chocolate", amount: "200g" },
      { name: "butter", amount: "150g" },
      { name: "sugar", amount: "200g" },
      { name: "eggs", amount: "3 large" },
      { name: "all-purpose flour", amount: "100g" },
      { name: "cocoa powder", amount: "30g" },
      { name: "vanilla extract", amount: "1 tsp" }
    ],
    instructions: [
      { text: "Melt chocolate and butter together in a double boiler" },
      { text: "Whisk sugar and eggs until pale and thick" },
      { text: "Combine chocolate mixture with egg mixture, add vanilla" },
      { text: "Fold in flour and cocoa powder until just combined" },
      { text: "Bake at 180°C for 25 minutes, cool before cutting" }
    ],
    prepTime: 15,
    cookTime: 25,
    servings: 12,
    difficulty: "Easy",
    category: "Dessert",
    nutrition: {
      calories: 280,
      carbs: 35,
      protein: 4,
      fat: 15
    }
  },
  {
    title: "Fresh Fruit Salad",
    description: "Colorful fruit salad with honey-lime dressing",
    ingredients: [
      { name: "mixed fresh fruits", amount: "6 cups" },
      { name: "honey", amount: "2 tbsp" },
      { name: "lime juice", amount: "2 tbsp" },
      { name: "mint leaves", amount: "1/4 cup" },
      { name: "Greek yogurt", amount: "1/2 cup optional" }
    ],
    instructions: [
      { text: "Wash and chop all fruits into bite-sized pieces" },
      { text: "Whisk together honey and lime juice for the dressing" },
      { text: "Combine all fruits in a large bowl" },
      { text: "Pour dressing over fruits and toss gently" },
      { text: "Chill for 30 minutes, garnish with mint before serving" }
    ],
    prepTime: 20,
    cookTime: 0,
    servings: 4,
    difficulty: "Easy",
    category: "Dessert",
    nutrition: {
      calories: 120,
      carbs: 30,
      protein: 2,
      fat: 1
    }
  },
  {
    title: "Classic Tiramisu",
    description: "Italian coffee-flavored dessert with mascarpone cream",
    ingredients: [
      { name: "ladyfinger cookies", amount: "24 pieces" },
      { name: "espresso coffee", amount: "2 cups strong" },
      { name: "mascarpone cheese", amount: "500g" },
      { name: "eggs", amount: "4 separated" },
      { name: "sugar", amount: "100g" },
      { name: "cocoa powder", amount: "2 tbsp" }
    ],
    instructions: [
      { text: "Brew strong espresso coffee and let it cool" },
      { text: "Beat egg yolks with sugar until pale and thick" },
      { text: "Mix mascarpone into yolk mixture, then fold in whipped egg whites" },
      { text: "Quickly dip ladyfingers in coffee and layer in dish" },
      { text: "Alternate layers of cream and cookies, dust with cocoa powder" }
    ],
    prepTime: 30,
    cookTime: 0,
    servings: 8,
    difficulty: "Medium",
    category: "Dessert",
    nutrition: {
      calories: 320,
      carbs: 25,
      protein: 8,
      fat: 22
    }
  },

  // Vegetarian Recipes
  {
    title: "Mushroom Risotto",
    description: "Creamy mushroom risotto with Parmesan and herbs",
    ingredients: [
      { name: "Arborio rice", amount: "1 1/2 cups" },
      { name: "mixed mushrooms", amount: "400g sliced" },
      { name: "vegetable broth", amount: "4 cups warm" },
      { name: "white wine", amount: "1/2 cup" },
      { name: "Parmesan cheese", amount: "1/2 cup grated" },
      { name: "onion", amount: "1 medium diced" },
      { name: "garlic", amount: "2 cloves minced" }
    ],
    instructions: [
      { text: "Sauté mushrooms until golden brown, set aside" },
      { text: "Cook onion and garlic until soft, add rice and toast for 2 minutes" },
      { text: "Add wine and cook until absorbed" },
      { text: "Add broth gradually, stirring constantly until rice is creamy" },
      { text: "Stir in mushrooms and Parmesan, serve immediately" }
    ],
    prepTime: 10,
    cookTime: 30,
    servings: 3,
    difficulty: "Medium",
    category: "Vegetarian",
    nutrition: {
      calories: 380,
      carbs: 55,
      protein: 12,
      fat: 10
    }
  },
  {
    title: "Vegetable Curry",
    description: "Spicy and flavorful vegetable curry with coconut milk",
    ingredients: [
      { name: "mixed vegetables", amount: "5 cups" },
      { name: "coconut milk", amount: "400ml can" },
      { name: "curry paste", amount: "2 tbsp" },
      { name: "vegetable broth", amount: "1 cup" },
      { name: "fresh cilantro", amount: "1/4 cup" },
      { name: "lime juice", amount: "1 tbsp" },
      { name: "fish sauce", amount: "1 tbsp optional" }
    ],
    instructions: [
      { text: "Sauté vegetables in a large pot for 5 minutes" },
      { text: "Add curry paste and cook for 1 minute until fragrant" },
      { text: "Pour in coconut milk and vegetable broth" },
      { text: "Simmer for 15-20 minutes until vegetables are tender" },
      { text: "Stir in lime juice and garnish with fresh cilantro" }
    ],
    prepTime: 15,
    cookTime: 25,
    servings: 4,
    difficulty: "Medium",
    category: "Vegetarian",
    nutrition: {
      calories: 220,
      carbs: 25,
      protein: 6,
      fat: 12
    }
  },
  {
    title: "Caprese Salad",
    description: "Simple Italian salad with fresh tomato, mozzarella and basil",
    ingredients: [
      { name: "fresh tomatoes", amount: "4 medium" },
      { name: "mozzarella cheese", amount: "250g" },
      { name: "fresh basil", amount: "1/2 cup leaves" },
      { name: "olive oil", amount: "3 tbsp" },
      { name: "balsamic glaze", amount: "2 tbsp" },
      { name: "salt", amount: "1/2 tsp" },
      { name: "black pepper", amount: "1/4 tsp" }
    ],
    instructions: [
      { text: "Slice tomatoes and mozzarella into 1/4 inch slices" },
      { text: "Arrange tomato and mozzarella slices alternately on a plate" },
      { text: "Tuck fresh basil leaves between the slices" },
      { text: "Drizzle with olive oil and balsamic glaze" },
      { text: "Season with salt and freshly ground black pepper" }
    ],
    prepTime: 10,
    cookTime: 0,
    servings: 2,
    difficulty: "Easy",
    category: "Vegetarian",
    nutrition: {
      calories: 280,
      carbs: 12,
      protein: 15,
      fat: 20
    }
  }
];

// User IDs
const userIds = [
  '690c4fc16ff51f6d25d2ea9d',
  '690c56ca6ff51f6d25d2eb4a', 
  '690c576e6ff51f6d25d2eb59',
  '690c57c96ff51f6d25d2eb5f'
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database-name');
    console.log('✅ Connected to MongoDB');

   
    // Create recipes for each user
    let totalRecipesCreated = 0;

    for (const userId of userIds) {
      console.log(`\n👤 Creating recipes for user: ${userId}`);
      
      const userRecipes = sampleRecipes.map(recipe => ({
        ...recipe,
        author: userId,
        imageUrl: recipe.imageUrl || `/uploads/recipes/${recipe.title.toLowerCase().replace(/\s+/g, '-')}.jpg`,
        reviewCount: Math.floor(Math.random() * 50) + 1, // Random reviews between 1-50
        rating: parseFloat((Math.random() * 2 + 3).toFixed(1)) // Random rating between 3.0-5.0
      }));

      await Recipe.insertMany(userRecipes);
      totalRecipesCreated += userRecipes.length;
      console.log(`✅ Created ${userRecipes.length} recipes for user ${userId}`);
    }

    console.log(`\n🎉 Successfully created ${totalRecipesCreated} total recipes for ${userIds.length} users!`);
    
    // Update user recipes count
    const User = mongoose.model('User');
    for (const userId of userIds) {
      const recipeCount = await Recipe.countDocuments({ author: userId });
      await User.findByIdAndUpdate(userId, { recipesCount: recipeCount });
      console.log(`✅ Updated recipes count for user ${userId}: ${recipeCount}`);
    }

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  }
}

// Run the seed function
seedDatabase();