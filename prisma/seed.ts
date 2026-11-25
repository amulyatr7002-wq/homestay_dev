import { PropertyType, Vibe } from "@prisma/client";
import { prisma } from "../lib/prisma";

const destinations = [
  { name: "Coorg", slug: "coorg", description: "Coffee country, rain-washed trails, and Kodava hospitality.", latitude: 12.3375, longitude: 75.8069 },
  { name: "Chikmagalur", slug: "chikmagalur", description: "Highland coffee estates beneath the Mullayanagiri peaks.", latitude: 13.3161, longitude: 75.772 },
  { name: "Gokarna", slug: "gokarna", description: "Quiet coves, temple streets, and the Arabian Sea.", latitude: 14.5479, longitude: 74.3188 },
  { name: "Sakleshpur", slug: "sakleshpur", description: "Monsoon hills and old railway trails in the Western Ghats.", latitude: 12.9416, longitude: 75.7847 },
  { name: "Udupi", slug: "udupi", description: "Coastal kitchens, temple towns, and palm-fringed shores.", latitude: 13.3409, longitude: 74.7421 },
  { name: "Hampi", slug: "hampi", description: "A surreal landscape of boulders and Vijayanagara history.", latitude: 15.335, longitude: 76.46 },
  { name: "Mysuru", slug: "mysuru", description: "Living heritage, shaded avenues, and royal-era homes.", latitude: 12.2958, longitude: 76.6394 },
  { name: "Kabini", slug: "kabini", description: "River-side stays at the edge of wild forest country.", latitude: 11.967, longitude: 76.253 },
];

const amenityNames = [
  "Breakfast included",
  "Coffee plantation walk",
  "Private balcony",
  "Bonfire",
  "Pet friendly",
  "Wi-Fi",
  "Home-cooked meals",
  "River view",
  "Beach access",
  "Garden",
  "Guided nature walk",
  "Heritage architecture",
  "Farm experience",
  "Mountain view",
  "Free parking",
];
const amenitySlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const stays: Array<{
  slug: string;
  title: string;
  description: string;
  city: string;
  destination: string;
  address: string;
  price: number;
  rating: number;
  reviews: number;
  guests: number;
  type: PropertyType;
  vibe: Vibe;
  lat: number;
  lon: number;
  host: string;
  hostBio: string;
  amenities: string[];
  photos: string[];
}> = [
  {
    slug: "peppervine-estate-house", title: "The Peppervine Estate House", description: "Wake to birdsong and the scent of cardamom in this family-run coffee estate. Walk the pepper vines with your host, then linger over a slow Kodava breakfast on the veranda.", city: "Madikeri", destination: "coorg", address: "Kakkabe Road, Madikeri, Kodagu", price: 4800, rating: 4.94, reviews: 86, guests: 4, type: "HOMESTAY", vibe: "FOREST", lat: 12.4244, lon: 75.7382, host: "Kavya M.", hostBio: "Third-generation coffee grower who loves sharing the old estate trails and family recipes.", amenities: ["Breakfast included", "Coffee plantation walk", "Private balcony", "Home-cooked meals"], photos: ["photo-1449158743715-0a90ebb6d2d8", "photo-1445019980597-93fa8acb246c", "photo-1510798831971-661eb04b3739"],
  },
  {
    slug: "mistwood-cabin", title: "Mistwood Cabin Above the Clouds", description: "A cedar cabin tucked into the hills, with a wood stove, a long mountain view, and nothing on the schedule. The best seats are the porch chairs at first light.", city: "Chikmagalur", destination: "chikmagalur", address: "Mullayanagiri foothills, Chikmagalur", price: 6200, rating: 4.91, reviews: 54, guests: 3, type: "CABIN", vibe: "MOUNTAINS", lat: 13.3915, lon: 75.7213, host: "Arjun & Leela", hostBio: "A local trekking guide and a ceramic artist, happiest when guests take the slow road.", amenities: ["Mountain view", "Bonfire", "Wi-Fi", "Free parking"], photos: ["photo-1510798831971-661eb04b3739", "photo-1501785888041-af3ef285b470", "photo-1464822759023-fed622ff2c3b"],
  },
  {
    slug: "little-kudle-house", title: "Little Kudle House", description: "A breezy home a short walk from Kudle Beach. Rinse off the salt, share a home-cooked fish curry, and watch the sky turn rose from your own little terrace.", city: "Gokarna", destination: "gokarna", address: "Kudle Beach Road, Gokarna", price: 3400, rating: 4.88, reviews: 112, guests: 4, type: "HOMESTAY", vibe: "BEACH", lat: 14.5322, lon: 74.3161, host: "Savitri Naik", hostBio: "Gokarna local, beach walker, and keeper of the best sunset picnic spots.", amenities: ["Beach access", "Home-cooked meals", "Garden", "Pet friendly"], photos: ["photo-1499793983690-e29da59ef1c2", "photo-1470770841072-f978cf4d019e", "photo-1500375592092-40eb2168fd21"],
  },
  {
    slug: "railway-trail-farmstay", title: "The Railway Trail Farmstay", description: "Follow an old coffee trail to this welcoming farm home. Spend the afternoon in the stream or take a guided walk through the cardamom and areca groves.", city: "Sakleshpur", destination: "sakleshpur", address: "Bisle Ghat Road, Sakleshpur", price: 2900, rating: 4.82, reviews: 73, guests: 5, type: "FARM_STAY", vibe: "FARM", lat: 12.9524, lon: 75.7015, host: "Nagesh Gowda", hostBio: "Farmer and storyteller, always happy to show guests what is in season.", amenities: ["Farm experience", "Guided nature walk", "Home-cooked meals", "Bonfire"], photos: ["photo-1449158743715-0a90ebb6d2d8", "photo-1500382017468-9049fed747ef", "photo-1500530855697-b586d89ba3ee"],
  },
  {
    slug: "coconut-grove-retreat", title: "Coconut Grove Retreat", description: "A tiled-roof coastal home in a quiet coconut grove. Mornings begin with filter coffee; evenings are for a stroll to the water and dinner with the family.", city: "Udupi", destination: "udupi", address: "Malpe Road, Udupi", price: 3700, rating: 4.9, reviews: 61, guests: 4, type: "COTTAGE", vibe: "BEACH", lat: 13.3248, lon: 74.7452, host: "Ananya & Prakash", hostBio: "A schoolteacher and retired sailor bringing coast-side hospitality home.", amenities: ["Beach access", "Garden", "Breakfast included", "Free parking"], photos: ["photo-1499793983690-e29da59ef1c2", "photo-1500375592092-40eb2168fd21", "photo-1445019980597-93fa8acb246c"],
  },
  {
    slug: "boulder-view-courtyard", title: "Boulder View Courtyard Home", description: "An airy courtyard house framed by Hampi's extraordinary boulder country. Your host knows the quieter temple paths and the best place to watch the last light.", city: "Hampi", destination: "hampi", address: "Anegundi, Hampi", price: 4100, rating: 4.87, reviews: 98, guests: 4, type: "HERITAGE_HOME", vibe: "HERITAGE", lat: 15.3561, lon: 76.4697, host: "Mohan Reddy", hostBio: "Anegundi native who leads gentle village and heritage walks.", amenities: ["Heritage architecture", "Home-cooked meals", "Private balcony", "Guided nature walk"], photos: ["photo-1600210492486-724fe5c67fb0", "photo-1600607687939-ce8a6c25118c", "photo-1600607687920-4e2a09cf159d"],
  },
  {
    slug: "blue-door-mysore", title: "The Blue Door Heritage Home", description: "A restored 1930s home with a pillared veranda, a shaded garden, and old Mysuru details kept just as they were. Walk to the market, then come home to a filter coffee.", city: "Mysuru", destination: "mysuru", address: "Lakshmipuram, Mysuru", price: 5200, rating: 4.96, reviews: 42, guests: 6, type: "HERITAGE_HOME", vibe: "HERITAGE", lat: 12.3036, lon: 76.6335, host: "Radhika Rao", hostBio: "Heritage conservationist restoring her grandparents' home one room at a time.", amenities: ["Heritage architecture", "Garden", "Breakfast included", "Wi-Fi"], photos: ["photo-1600210492486-724fe5c67fb0", "photo-1600607687939-ce8a6c25118c", "photo-1600607687920-4e2a09cf159d"],
  },
  {
    slug: "kabini-riverbank-cottage", title: "Riverbank Cottage at Kabini", description: "Listen for kingfishers from the deck of this river-edge cottage. Your host can arrange a local naturalist walk along the water before the afternoon heat settles in.", city: "Kabini", destination: "kabini", address: "Beechanahalli, Kabini", price: 7800, rating: 4.92, reviews: 38, guests: 4, type: "COTTAGE", vibe: "FOREST", lat: 11.9715, lon: 76.2742, host: "Ravi B. & family", hostBio: "River locals who share a love of birdwatching and the forests they call home.", amenities: ["River view", "Guided nature walk", "Home-cooked meals", "Bonfire"], photos: ["photo-1470770841072-f978cf4d019e", "photo-1500530855697-b586d89ba3ee", "photo-1449158743715-0a90ebb6d2d8"],
  },
  {
    slug: "cardamom-courtyard", title: "Cardamom Courtyard Cottage", description: "A bright cottage at the edge of an old plantation, where cardamom grows beneath silver oak. Follow the scent to the drying shed, then return for tea in the garden.", city: "Madikeri", destination: "coorg", address: "Napoklu, Kodagu", price: 3600, rating: 4.84, reviews: 47, guests: 3, type: "COTTAGE", vibe: "FARM", lat: 12.2168, lon: 75.7435, host: "Meera K.", hostBio: "Plantation caretaker and enthusiastic cook of seasonal Kodava dishes.", amenities: ["Farm experience", "Garden", "Breakfast included", "Pet friendly"], photos: ["photo-1449158743715-0a90ebb6d2d8", "photo-1500382017468-9049fed747ef", "photo-1445019980597-93fa8acb246c"],
  },
  {
    slug: "mullayanagiri-stone-house", title: "Stone House on the Mullayanagiri Road", description: "A hillside home built from local stone, with a wide valley view and an easy path to the estate's coffee trees. Keep the morning free for the mist.", city: "Chikmagalur", destination: "chikmagalur", address: "Baba Budangiri Road, Chikmagalur", price: 5400, rating: 4.89, reviews: 67, guests: 5, type: "HOMESTAY", vibe: "MOUNTAINS", lat: 13.3878, lon: 75.7296, host: "Suresh Hegde", hostBio: "Coffee grower who has lived beneath the peaks his whole life.", amenities: ["Mountain view", "Coffee plantation walk", "Bonfire", "Free parking"], photos: ["photo-1464822759023-fed622ff2c3b", "photo-1501785888041-af3ef285b470", "photo-1510798831971-661eb04b3739"],
  },
  {
    slug: "half-moon-beach-bungalow", title: "Half Moon Beach Bungalow", description: "A simple, sun-warmed bungalow above the shoreline. Take the footpath down for a swim, then let your hosts make you a long lunch with the morning's catch.", city: "Gokarna", destination: "gokarna", address: "Om Beach trail, Gokarna", price: 4500, rating: 4.86, reviews: 79, guests: 2, type: "VILLA", vibe: "BEACH", lat: 14.5261, lon: 74.3139, host: "Rohan & Tara", hostBio: "A couple who traded the city for the coast and never looked back.", amenities: ["Beach access", "Private balcony", "Home-cooked meals", "Garden"], photos: ["photo-1499793983690-e29da59ef1c2", "photo-1500375592092-40eb2168fd21", "photo-1470770841072-f978cf4d019e"],
  },
  {
    slug: "areca-nut-garden-room", title: "Areca Nut Garden Room", description: "A peaceful garden stay among areca palms and banana plants. Help your hosts gather fruit, then follow them into the kitchen for a coastal vegetarian meal.", city: "Sakleshpur", destination: "sakleshpur", address: "Hanbal village, Sakleshpur", price: 2500, rating: 4.78, reviews: 33, guests: 2, type: "FARM_STAY", vibe: "FARM", lat: 12.9862, lon: 75.7831, host: "Latha & Kumar", hostBio: "Smallholders growing areca, pepper, and whatever the monsoon brings.", amenities: ["Farm experience", "Garden", "Home-cooked meals", "Free parking"], photos: ["photo-1500382017468-9049fed747ef", "photo-1449158743715-0a90ebb6d2d8", "photo-1500530855697-b586d89ba3ee"],
  },
  {
    slug: "malpe-tiled-roof-home", title: "Malpe Tiled-Roof Home", description: "A traditional coastal home with red Mangalore tiles and a shady sit-out. Your hosts will point you toward the harbor at dawn and send you off with a tiffin for the beach.", city: "Udupi", destination: "udupi", address: "Malpe, Udupi", price: 3100, rating: 4.83, reviews: 56, guests: 5, type: "HOMESTAY", vibe: "BEACH", lat: 13.357, lon: 74.7031, host: "Shalini Poojary", hostBio: "A home cook and lifelong beachcomber with a soft spot for old tiled houses.", amenities: ["Beach access", "Home-cooked meals", "Breakfast included", "Garden"], photos: ["photo-1445019980597-93fa8acb246c", "photo-1499793983690-e29da59ef1c2", "photo-1500375592092-40eb2168fd21"],
  },
  {
    slug: "stone-and-sky-hampi", title: "Stone & Sky in Anegundi", description: "Sleep beneath a canopy of stars in a village home facing the granite hills. The house is simple, the breakfast generous, and the walk to the river beautiful.", city: "Hampi", destination: "hampi", address: "Anegundi village, Hampi", price: 2800, rating: 4.8, reviews: 121, guests: 3, type: "HOMESTAY", vibe: "HERITAGE", lat: 15.353, lon: 76.4725, host: "Basavaraj", hostBio: "Village guide who loves telling the stories carved into the stones nearby.", amenities: ["Heritage architecture", "Home-cooked meals", "Garden", "Guided nature walk"], photos: ["photo-1600607687920-4e2a09cf159d", "photo-1600210492486-724fe5c67fb0", "photo-1600607687939-ce8a6c25118c"],
  },
  {
    slug: "devaraja-market-townhouse", title: "Devaraja Market Townhouse", description: "A lovingly restored townhouse a few lanes from Mysuru's flower market. Step out early for the colors, then return to a quiet courtyard and a pot of tea.", city: "Mysuru", destination: "mysuru", address: "Devaraja Mohalla, Mysuru", price: 4300, rating: 4.9, reviews: 29, guests: 4, type: "HERITAGE_HOME", vibe: "HERITAGE", lat: 12.3087, lon: 76.6528, host: "Vikram S.", hostBio: "An architect preserving the details of Mysuru's old residential neighborhoods.", amenities: ["Heritage architecture", "Private balcony", "Wi-Fi", "Breakfast included"], photos: ["photo-1600607687939-ce8a6c25118c", "photo-1600210492486-724fe5c67fb0", "photo-1600607687920-4e2a09cf159d"],
  },
  {
    slug: "jungle-edge-tree-cottage", title: "Jungle-Edge Tree Cottage", description: "A small raised cottage under a canopy of old trees. Sip coffee to the sound of the forest and ask your host about the quiet places to watch the river.", city: "Kabini", destination: "kabini", address: "Antharasanthe, Kabini", price: 6800, rating: 4.88, reviews: 44, guests: 3, type: "CABIN", vibe: "FOREST", lat: 11.9137, lon: 76.3096, host: "Manjunath", hostBio: "Local naturalist and longtime advocate for wildlife-friendly travel.", amenities: ["River view", "Guided nature walk", "Bonfire", "Free parking"], photos: ["photo-1500530855697-b586d89ba3ee", "photo-1470770841072-f978cf4d019e", "photo-1510798831971-661eb04b3739"],
  },
  {
    slug: "monsoon-veranda-house", title: "Monsoon Veranda House", description: "A generous family home on a working coffee estate. When the rains arrive, settle into the deep veranda with a book and a fresh pot of estate-grown coffee.", city: "Madikeri", destination: "coorg", address: "Suntikoppa, Kodagu", price: 3900, rating: 4.93, reviews: 93, guests: 6, type: "HOMESTAY", vibe: "MOUNTAINS", lat: 12.455, lon: 75.834, host: "Dinesh & Poonam", hostBio: "Hosts for over a decade, known for their estate walks and Sunday pandi curry.", amenities: ["Coffee plantation walk", "Home-cooked meals", "Private balcony", "Bonfire"], photos: ["photo-1449158743715-0a90ebb6d2d8", "photo-1445019980597-93fa8acb246c", "photo-1501785888041-af3ef285b470"],
  },
  {
    slug: "coffee-blossom-hideaway", title: "Coffee Blossom Hideaway", description: "A private cottage hidden in a coffee garden, with an outdoor shower and a hammock that gets the afternoon sun. Breakfast arrives with fresh fruit from the orchard.", city: "Chikmagalur", destination: "chikmagalur", address: "Aldur, Chikmagalur", price: 7200, rating: 4.97, reviews: 58, guests: 2, type: "COTTAGE", vibe: "FOREST", lat: 13.2138, lon: 75.8034, host: "Nikhil & Asha", hostBio: "Estate owners who built a tiny retreat to share the quiet beauty of blossom season.", amenities: ["Coffee plantation walk", "Private balcony", "Breakfast included", "Garden"], photos: ["photo-1510798831971-661eb04b3739", "photo-1449158743715-0a90ebb6d2d8", "photo-1500530855697-b586d89ba3ee"],
  },
  {
    slug: "sea-wind-homestay", title: "Sea Wind Homestay", description: "A welcoming family homestay close to the old temple streets and a quiet stretch of beach. Try the morning dosa and ask about the fishing boats returning at sunrise.", city: "Gokarna", destination: "gokarna", address: "Main Road, Gokarna", price: 2200, rating: 4.76, reviews: 147, guests: 4, type: "HOMESTAY", vibe: "BEACH", lat: 14.5516, lon: 74.3181, host: "Asha Naik", hostBio: "A local family host who loves introducing guests to the town's everyday rhythms.", amenities: ["Beach access", "Home-cooked meals", "Free parking", "Pet friendly"], photos: ["photo-1500375592092-40eb2168fd21", "photo-1499793983690-e29da59ef1c2", "photo-1470770841072-f978cf4d019e"],
  },
  {
    slug: "pepper-court-farmhouse", title: "Pepper Court Farmhouse", description: "A simple farmhouse set among pepper vines and jackfruit trees. Help with the morning harvest if you like, or take the path to the stream and do absolutely nothing.", city: "Sakleshpur", destination: "sakleshpur", address: "Devaladakere, Sakleshpur", price: 3300, rating: 4.85, reviews: 52, guests: 5, type: "FARM_STAY", vibe: "FARM", lat: 12.8929, lon: 75.8679, host: "Sanjay Shetty", hostBio: "Grower, home cook, and an expert at helping guests do less.", amenities: ["Farm experience", "Home-cooked meals", "Bonfire", "Garden"], photos: ["photo-1500382017468-9049fed747ef", "photo-1449158743715-0a90ebb6d2d8", "photo-1500530855697-b586d89ba3ee"],
  },
];

export async function seedDemoData(productionSafe = process.env.NODE_ENV === "production", includeDemoData = process.env.SEED_DEMO_DATA === "true") {
  if (productionSafe && !includeDemoData) {
    console.info("Demo data seeding skipped. Set SEED_DEMO_DATA=true to opt in.");
    return;
  }
  const destinationIds = new Map<string, string>();
  for (const destination of destinations) {
    const record = await prisma.destination.upsert({
      where: { slug: destination.slug },
      create: destination,
      update: productionSafe ? {} : destination,
    });
    destinationIds.set(destination.slug, record.id);
  }

  const amenityIds = new Map<string, string>();
  for (const name of amenityNames) {
    const slug = amenitySlug(name);
    const record = await prisma.amenity.upsert({
      where: { slug },
      create: { name, slug },
      update: productionSafe ? {} : { name },
    });
    amenityIds.set(slug, record.id);
  }

  for (const stay of stays) {
    const { destination, address, price, reviews, guests, type, lat, lon, host, hostBio, photos, amenities, ...listing } = stay;
    const imageRecords = photos.map((photo, position) => ({
      url: `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1400&q=85`,
      alt: `${listing.title} — ${position === 0 ? "homestay" : `view ${position + 1}`}`,
      position,
    }));
    const amenityRecords = amenities.map((name) => {
      const id = amenityIds.get(amenitySlug(name));
      if (!id) throw new Error(`Unknown amenity in seed data: ${name}`);
      return { id };
    });
    const common = {
      ...listing,
      address,
      pricePerNight: price,
      reviewCount: reviews,
      maxGuests: guests,
      propertyType: type,
      latitude: lat,
      longitude: lon,
      hostName: host,
      hostBio,
      destinationId: destinationIds.get(destination)!,
    };

    await prisma.listing.upsert({
      where: { slug: listing.slug },
      create: {
        ...common,
        images: { create: imageRecords },
        amenities: { connect: amenityRecords },
      },
      update: productionSafe ? {} : {
        ...common,
        images: { deleteMany: {}, create: imageRecords },
        amenities: { set: amenityRecords },
      },
    });
  }

  console.info(`Demo seed processed ${stays.length} Karnataka homestays${productionSafe ? " without overwriting existing records" : ""}.`);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/seed.ts")) {
  void seedDemoData()
    .catch((error: unknown) => {
      console.error("Database seed failed:", error);
      process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
}
