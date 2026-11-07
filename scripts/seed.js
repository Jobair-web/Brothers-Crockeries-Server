/**
 * Demo data: categories + ~49 sample products (enough to test 40-per-page pagination).
 * Run:  npm run seed          (adds anything missing, never deletes)
 *       npm run seed -- --fresh   (wipes categories + products first)
 * Images are placeholders – replace them from the Admin panel.
 */
import "dotenv/config";
import mongoose from "mongoose";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import { slugify } from "../utils/slugify.js";

const categories = [
  { name: "Dinner Sets & Plates", slug: "dinner-sets", icon: "utensils" },
  { name: "Non-stick Cookware", slug: "cookware", icon: "cooking-pot" },
  { name: "Rice Cookers", slug: "rice-cookers", icon: "soup" },
  { name: "Blender & Grinder", slug: "blender-grinder", icon: "blend" },
  { name: "Water Filters", slug: "water-filters", icon: "droplets" },
  { name: "Kitchen Appliances", slug: "kitchen-appliances", icon: "microwave" },
  { name: "Mops & Cleaning", slug: "mops-cleaning", icon: "spray-can" },
  { name: "Tea & Coffee Ware", slug: "tea-coffee", icon: "coffee" },
  { name: "Storage & Containers", slug: "storage", icon: "package" },
  { name: "Irons & Fans", slug: "irons-fans", icon: "zap" },
];

// [categorySlug, title, price, originalPrice]
const products = [
  ["dinner-sets", "Blue Floral Porcelain Dinner Set 32 Pcs", 6800, 7500],
  ["dinner-sets", "Melamine Dinner Set 24 Pcs", 2850, 3200],
  ["dinner-sets", "Opal Glass Plate Set 12 Pcs", 2400, 2700],
  ["dinner-sets", "Ceramic Soup Bowl Set 6 Pcs", 950, 1100],
  ["dinner-sets", "Stainless Steel Thali Set 6 Pcs", 1650, 1850],
  ["cookware", "Granite Non-stick Frying Pan 26cm", 1250, 1500],
  ["cookware", "Non-stick Cookware Set 5 Pcs", 4200, 4800],
  ["cookware", "Stainless Steel Pressure Cooker 5L", 3300, 3700],
  ["cookware", "Non-stick Tawa 28cm", 780, 900],
  ["cookware", "Glass Lid Casserole Set 3 Pcs", 2950, 3300],
  ["cookware", "Deep Kadai with Lid 24cm", 1450, 1650],
  ["rice-cookers", "Electric Rice Cooker 1.8L", 3450, 3900],
  ["rice-cookers", "Electric Rice Cooker 2.8L with Steamer", 4650, 5200],
  ["rice-cookers", "Mini Multi Cooker 1.5L", 1850, 2200],
  ["rice-cookers", "Double Pot Rice Cooker 2.2L", 3950, 4400],
  ["blender-grinder", "750W Mixer Grinder 3 Jar", 5150, 5500],
  ["blender-grinder", "1000W Mixer Grinder 4 Jar", 6100, 6800],
  ["blender-grinder", "Hand Blender 400W", 1650, 1900],
  ["blender-grinder", "Electric Food Chopper 3L", 1850, 2250],
  ["blender-grinder", "Juicer Blender 600W", 3250, 3600],
  ["water-filters", "Gravity Water Filter 20L", 2950, 3300],
  ["water-filters", "Stainless Steel Ceramic Water Filter", 3850, 4300],
  ["water-filters", "5-Stage RO Water Purifier", 12500, 14000],
  ["water-filters", "Water Dispenser Stand with Tap", 1350, 1500],
  ["water-filters", "Replacement Ceramic Candle (Pack of 2)", 450, 550],
  ["kitchen-appliances", "Electric Oven Toaster 25L", 8900, 9800],
  ["kitchen-appliances", "Air Fryer 4.2L", 8300, 9500],
  ["kitchen-appliances", "Electric Kettle 1.8L", 1250, 1450],
  ["kitchen-appliances", "Sandwich Maker 2 Slice", 1550, 1800],
  ["kitchen-appliances", "Induction Cooker 2000W", 4400, 4900],
  ["mops-cleaning", "Spin Mop with Bucket", 1950, 2300],
  ["mops-cleaning", "Flat Microfiber Mop", 850, 1000],
  ["mops-cleaning", "Floor Wiper 3 in 1", 650, 780],
  ["mops-cleaning", "Bathroom Brush Set 3 Pcs", 380, 450],
  ["mops-cleaning", "Door Mat Set 4 Pcs", 520, 650],
  ["tea-coffee", "Ceramic Tea Cup Set 12 Pcs", 1450, 1700],
  ["tea-coffee", "Glass Mug with Lid & Straw 3 Pcs", 980, 1150],
  ["tea-coffee", "Stainless Steel Flask 1L", 1250, 1450],
  ["tea-coffee", "Coffee Mug Set 6 Pcs", 890, 1050],
  ["tea-coffee", "Ceramic Tea Pot 1.2L", 1350, 1550],
  ["storage", "Airtight Container Set 6 Pcs", 1150, 1350],
  ["storage", "Spice Rack 12 Jar", 1250, 1500],
  ["storage", "Stainless Steel Lunch Box 3 Tier", 950, 1100],
  ["storage", "Plastic Storage Box 5 Pcs", 780, 900],
  ["storage", "Water Bottle 1L (Set of 4)", 650, 800],
  ["irons-fans", "Dry Iron 1000W", 1650, 1900],
  ["irons-fans", "Steam Iron 1400W", 2750, 3100],
  ["irons-fans", "Table Fan 12 inch", 2850, 3200],
  ["irons-fans", "Rechargeable Hand Fan", 650, 800],
];

const placeholder = (text) =>
  `https://placehold.co/600x600/e6f7fb/12113a/png?text=${encodeURIComponent(text.split(" ").slice(0, 3).join("\n"))}`;

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  if (process.argv.includes("--fresh")) {
    await Promise.all([Category.deleteMany({}), Product.deleteMany({})]);
    console.log("Cleared categories and products");
  }

  const catIds = {};
  for (const [i, c] of categories.entries()) {
    const doc = await Category.findOneAndUpdate({ slug: c.slug }, { $setOnInsert: { ...c, order: i, isFeatured: true } }, { upsert: true, new: true });
    catIds[c.slug] = doc._id;
  }

  let created = 0;
  for (const [i, [cat, title, price, originalPrice]] of products.entries()) {
    const res = await Product.updateOne(
      { title },
      {
        $setOnInsert: {
          title,
          slug: slugify(title),
          description: `${title} – quality home product from Brothers Crockeries. (Demo data: edit this from the Admin panel.)`,
          price,
          originalPrice,
          category: catIds[cat],
          brand: "BC Select",
          images: [{ url: placeholder(title), provider: "external" }],
          stock: i === 7 ? 0 : 8 + ((i * 7) % 30),
          inStock: i !== 7,
          isFeatured: i % 5 === 0,
          createdAt: new Date(Date.now() - i * 60_000),
        },
      },
      { upsert: true }
    );
    created += res.upsertedCount;
  }
  console.log(`Seed complete: ${categories.length} categories, ${created} new products (${products.length} total defined)`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
