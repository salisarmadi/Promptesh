// ─── Gallery data ─────────────────────────────────────────────────────────────
// Central dataset for the پرامپتا MVP: categories, models and prompt records.

export interface GalleryItem {
  id: number;
  imageUrl: string;
  prompt: string;
  model: string;
  category: string;
  likes: number;
  tall?: boolean;
}

export interface HeroCategory {
  id: string;
  label: string;
  thumb: string;
}

/** Unsplash photo id → sized, cropped URL. */
const img = (id: string, w = 620, h = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&crop=entropy&auto=format&q=80`;

export const MODELS = [
  "همه مدل‌ها",
  "Midjourney",
  "GPT Image",
  "Flux",
  "Leonardo",
  "DALL-E 3",
  "Nano Banana",
  "Ideogram",
];

/** Category order drives both the hero rail and the gallery filter pills. */
export const HERO_CATEGORIES: HeroCategory[] = [
  { id: "کاپل", label: "کاپل", thumb: img("1548210612-9968def675bb", 160, 160) },
  { id: "تبلیغات", label: "تبلیغات", thumb: img("1591892212776-a09de24dbe84", 160, 160) },
  { id: "پروفایل", label: "پروفایل", thumb: img("1563170446-9c3c0622d8a9", 160, 160) },
  { id: "مد و استایل", label: "مد", thumb: img("1727341557146-4abab94d0812", 160, 160) },
  { id: "فانتزی", label: "فانتزی", thumb: img("1779243829348-85bf26cff23b", 160, 160) },
  { id: "سه‌بعدی", label: "سه‌بعدی", thumb: img("1618005198919-d3d4b5a92ead", 160, 160) },
  { id: "معماری", label: "معماری", thumb: img("1711873316332-acb6930211e1", 160, 160) },
  { id: "غذا", label: "غذا", thumb: img("1629272040444-2f7553ec7466", 160, 160) },
  { id: "خودرو", label: "خودرو", thumb: img("1629934844513-df3e988a0157", 160, 160) },
  { id: "حیوانات", label: "حیوانات", thumb: img("1611843275167-a9bba9aa65dd", 160, 160) },
  { id: "طبیعت", label: "طبیعت", thumb: img("1757269267274-085b02b0ce8a", 160, 160) },
];

export const CATEGORIES = ["همه", ...HERO_CATEGORIES.map(c => c.id)];

export const ALL_ITEMS: GalleryItem[] = [
  // ── کاپل ────────────────────────────────────────────────────────────────
  {
    id: 1,
    imageUrl: img("1548210612-9968def675bb"),
    prompt:
      "romantic couple kissing in soft daylight, warm skin tones, shallow depth of field, candid documentary wedding photography, 85mm f/1.4, kodak portra 400",
    model: "Midjourney",
    category: "کاپل",
    likes: 3184,
    tall: true,
  },
  {
    id: 2,
    imageUrl: img("1693129551108-c1e0ab10f10e", 620, 460),
    prompt:
      "couple standing in a golden wheat field at sunset, backlit rim light, wide cinematic framing, warm analog color grade, anamorphic flare",
    model: "Flux",
    category: "کاپل",
    likes: 1908,
  },
  {
    id: 3,
    imageUrl: img("1545343403-03e407630152"),
    prompt:
      "intimate close up of a couple, shallow focus on eyes, natural window light, muted pastel palette, fine art portrait, medium format film grain",
    model: "Leonardo",
    category: "کاپل",
    likes: 2471,
    tall: true,
  },
  {
    id: 4,
    imageUrl: img("1496156555893-ce6408188e2c"),
    prompt:
      "couple on a city railing at night, bokeh street lights, teal and orange grade, cinematic night photography, 35mm, subtle film grain",
    model: "GPT Image",
    category: "کاپل",
    likes: 1642,
    tall: true,
  },

  // ── تبلیغات ─────────────────────────────────────────────────────────────
  {
    id: 5,
    imageUrl: img("1591892212776-a09de24dbe84"),
    prompt:
      "gold and black luxury perfume bottle, dark gradient backdrop, dramatic rim lighting, glossy reflections, commercial product advertising, 8k macro",
    model: "Midjourney",
    category: "تبلیغات",
    likes: 2210,
    tall: true,
  },
  {
    id: 6,
    imageUrl: img("1622618991746-fe6004db3a47"),
    prompt:
      "two clear glass perfume bottles on a soft beige set, diffused studio softbox, minimal beauty campaign, pastel color grading, ultra sharp detail",
    model: "Flux",
    category: "تبلیغات",
    likes: 1387,
    tall: true,
  },
  {
    id: 7,
    imageUrl: img("1764694187688-454d172e5ca0", 620, 460),
    prompt:
      "serum bottle surrounded by floating translucent glass shapes, studio gradient background, editorial skincare advertising, hyperreal render, 8k",
    model: "Ideogram",
    category: "تبلیغات",
    likes: 964,
  },
  {
    id: 8,
    imageUrl: img("1772191399367-91ed8d95664b"),
    prompt:
      "dark obsidian bottle on a stone pedestal, moody low key lighting, volumetric haze, premium product hero shot, cinematic advertising still",
    model: "Nano Banana",
    category: "تبلیغات",
    likes: 1521,
    tall: true,
  },

  // ── پروفایل ─────────────────────────────────────────────────────────────
  {
    id: 9,
    imageUrl: img("1563170446-9c3c0622d8a9"),
    prompt:
      "clean beauty headshot, striking blue eyes, soft key light with subtle fill, neutral background, natural skin texture, 85mm portrait lens",
    model: "Midjourney",
    category: "پروفایل",
    likes: 4102,
    tall: true,
  },
  {
    id: 10,
    imageUrl: img("1633381521050-26bb467d9d5a"),
    prompt:
      "black and white studio portrait, long flowing hair, dramatic chiaroscuro lighting, high contrast monochrome, editorial magazine style",
    model: "GPT Image",
    category: "پروفایل",
    likes: 2856,
    tall: true,
  },
  {
    id: 11,
    imageUrl: img("1517462964-21fdcec3f25b", 620, 460),
    prompt:
      "outdoor portrait in a wool coat, overcast diffused light, muted earth tones, candid lifestyle framing, natural retouch, 50mm",
    model: "Leonardo",
    category: "پروفایل",
    likes: 1180,
  },
  {
    id: 12,
    imageUrl: img("1606143412458-acc5f86de897"),
    prompt:
      "minimal studio portrait, single softbox key, deep shadow falloff, matte skin retouch, professional profile picture, sharp eyes, 8k",
    model: "Flux",
    category: "پروفایل",
    likes: 1733,
    tall: true,
  },

  // ── مد و استایل ─────────────────────────────────────────────────────────
  {
    id: 13,
    imageUrl: img("1727341557146-4abab94d0812"),
    prompt:
      "avant garde fashion editorial, black coat obscuring the face, stark studio light, high contrast, vogue cover aesthetic, hasselblad look",
    model: "Midjourney",
    category: "مد و استایل",
    likes: 2044,
    tall: true,
  },
  {
    id: 14,
    imageUrl: img("1612928414075-bc722ade44f1"),
    prompt:
      "grayscale fashion portrait in a leather jacket, hard directional light, grainy analog texture, 90s editorial mood, 35mm black and white",
    model: "Ideogram",
    category: "مد و استایل",
    likes: 1298,
    tall: true,
  },
  {
    id: 15,
    imageUrl: img("1613915617430-8ab0fd7c6baf", 620, 460),
    prompt:
      "studio fashion shot, gray scarf across the face, soft gradient backdrop, monochrome styling, minimal editorial composition",
    model: "DALL-E 3",
    category: "مد و استایل",
    likes: 877,
  },

  // ── فانتزی ──────────────────────────────────────────────────────────────
  {
    id: 16,
    imageUrl: img("1779243829348-85bf26cff23b"),
    prompt:
      "surreal open window floating above the clouds, winding path into the sky, dreamlike pastel palette, magritte inspired, matte painting, 8k",
    model: "Flux",
    category: "فانتزی",
    likes: 3520,
    tall: true,
  },
  {
    id: 17,
    imageUrl: img("1758472712764-4b746ea18d9b", 620, 620),
    prompt:
      "silhouette before a glowing red portal, volumetric fog, ominous cinematic lighting, dark fantasy concept art, ultra detailed",
    model: "Midjourney",
    category: "فانتزی",
    likes: 2688,
  },
  {
    id: 18,
    imageUrl: img("1631610039335-3de4e10e13c0"),
    prompt:
      "lone figure gazing at a galaxy filled night sky, milky way core, long exposure astrophotography, deep blues and violets, epic scale",
    model: "Leonardo",
    category: "فانتزی",
    likes: 1955,
    tall: true,
  },
  {
    id: 19,
    imageUrl: img("1779419171796-1aff900f9f60"),
    prompt:
      "a hand offering flowers through a doorway in the clouds, soft dreamy light, surrealist digital art, warm pastel gradient, whimsical mood",
    model: "GPT Image",
    category: "فانتزی",
    likes: 1406,
    tall: true,
  },

  // ── سه‌بعدی ─────────────────────────────────────────────────────────────
  {
    id: 20,
    imageUrl: img("1618005198919-d3d4b5a92ead", 620, 460),
    prompt:
      "pastel 3d spheres on a smooth gradient background, soft global illumination, subsurface scattering, octane render, clean product aesthetic",
    model: "Nano Banana",
    category: "سه‌بعدی",
    likes: 1810,
  },
  {
    id: 21,
    imageUrl: img("1617791160505-6f00504e3519", 620, 460),
    prompt:
      "abstract fluid 3d shapes in pink green and blue, iridescent material, studio hdri lighting, blender cycles render, 8k wallpaper",
    model: "Flux",
    category: "سه‌بعدی",
    likes: 1244,
  },
  {
    id: 22,
    imageUrl: img("1671519821564-ced7e41ee7ae"),
    prompt:
      "cluster of glossy translucent cubes, soft shadows, minimal beige set, isometric composition, high end cgi render, ultra clean",
    model: "Ideogram",
    category: "سه‌بعدی",
    likes: 932,
    tall: true,
  },

  // ── معماری ──────────────────────────────────────────────────────────────
  {
    id: 23,
    imageUrl: img("1711873316332-acb6930211e1"),
    prompt:
      "long white minimal hallway with a linear skylight, brutalist concrete, soft daylight gradient, architectural photography, one point perspective",
    model: "Midjourney",
    category: "معماری",
    likes: 2137,
    tall: true,
  },
  {
    id: 24,
    imageUrl: img("1642207303133-3c2a148e5e76"),
    prompt:
      "pink monochrome interior with curved stairs and a circular light, memphis inspired, soft shadows, editorial interior render, 8k",
    model: "Flux",
    category: "معماری",
    likes: 1592,
    tall: true,
  },
  {
    id: 25,
    imageUrl: img("1724582586458-a51791349977", 620, 460),
    prompt:
      "modern living room with a full height window, warm oak and linen palette, natural afternoon light, scandinavian interior, architectural digest",
    model: "DALL-E 3",
    category: "معماری",
    likes: 1023,
  },

  // ── غذا ─────────────────────────────────────────────────────────────────
  {
    id: 26,
    imageUrl: img("1629272040444-2f7553ec7466"),
    prompt:
      "strawberry cake on a black table, dark moody food photography, single window light, deep shadows, glossy glaze detail, 100mm macro",
    model: "Midjourney",
    category: "غذا",
    likes: 1466,
    tall: true,
  },
  {
    id: 27,
    imageUrl: img("1590742309630-e9f9b66da3f7"),
    prompt:
      "gourmet burger with fresh lettuce and tomato, dramatic side light, steam wisps, rich contrast, commercial food advertising shot",
    model: "GPT Image",
    category: "غذا",
    likes: 1189,
    tall: true,
  },
  {
    id: 28,
    imageUrl: img("1458253756247-1e4ed949191b", 620, 460),
    prompt:
      "chocolate cake on a matte black surface, low key lighting, cocoa dust, editorial dessert photography, shallow depth of field",
    model: "Leonardo",
    category: "غذا",
    likes: 845,
  },

  // ── خودرو ───────────────────────────────────────────────────────────────
  {
    id: 29,
    imageUrl: img("1629934844513-df3e988a0157"),
    prompt:
      "purple sports car parked before a white building, clean midday light, saturated color grade, automotive editorial photography, 35mm",
    model: "Midjourney",
    category: "خودرو",
    likes: 2765,
    tall: true,
  },
  {
    id: 30,
    imageUrl: img("1600998837340-4887228e311f", 620, 460),
    prompt:
      "black sports car on a wet road at night, neon reflections, long exposure light trails, cyberpunk city grade, cinematic automotive shot",
    model: "Flux",
    category: "خودرو",
    likes: 3011,
  },
  {
    id: 31,
    imageUrl: img("1698679324756-63617972acb3"),
    prompt:
      "night city street with parked cars, sodium street lamps, foggy atmosphere, moody blue grade, 35mm street photography, film grain",
    model: "Nano Banana",
    category: "خودرو",
    likes: 1074,
    tall: true,
  },

  // ── حیوانات ─────────────────────────────────────────────────────────────
  {
    id: 32,
    imageUrl: img("1611843275167-a9bba9aa65dd"),
    prompt:
      "tabby cat portrait on a pure black background, single rim light, sharp fur detail, studio pet photography, dramatic low key, 8k",
    model: "Midjourney",
    category: "حیوانات",
    likes: 2402,
    tall: true,
  },
  {
    id: 33,
    imageUrl: img("1629740067905-bd3f515aa739"),
    prompt:
      "fluffy small dog on a green backdrop, playful expression, bright even studio light, vibrant color pop, commercial pet portrait",
    model: "Leonardo",
    category: "حیوانات",
    likes: 1685,
    tall: true,
  },
  {
    id: 34,
    imageUrl: img("1647806422508-0322f33e270b", 620, 460),
    prompt:
      "cat sitting against a bold yellow background, minimal composition, soft shadow, contemporary pet editorial, medium format look",
    model: "Ideogram",
    category: "حیوانات",
    likes: 1137,
  },

  // ── طبیعت ───────────────────────────────────────────────────────────────
  {
    id: 35,
    imageUrl: img("1757269267274-085b02b0ce8a", 620, 460),
    prompt:
      "sunbeams breaking through clouds over mountain peaks, dramatic god rays, epic landscape photography, rich contrast, 8k wide angle",
    model: "Midjourney",
    category: "طبیعت",
    likes: 3298,
  },
  {
    id: 36,
    imageUrl: img("1603657523988-76184975d205"),
    prompt:
      "layered mountain silhouettes under an orange sky, golden hour haze, minimal gradient composition, fine art landscape print",
    model: "DALL-E 3",
    category: "طبیعت",
    likes: 1841,
    tall: true,
  },
  {
    id: 37,
    imageUrl: img("1489493512598-d08130f49bea", 620, 460),
    prompt:
      "rolling brown mountains at dusk, soft aerial perspective, muted warm palette, drone landscape photography, natural color grade",
    model: "Flux",
    category: "طبیعت",
    likes: 1276,
  },
  {
    id: 38,
    imageUrl: img("1612676239016-41e2c92b8e06"),
    prompt:
      "misty mountain silhouettes at dawn, layered depth fade, monochrome blue palette, serene minimal landscape, long lens compression",
    model: "GPT Image",
    category: "طبیعت",
    likes: 1502,
    tall: true,
  },
];

export const ITEMS_BY_CATEGORY: Record<string, GalleryItem[]> =
  HERO_CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = ALL_ITEMS.filter(item => item.category === cat.id);
    return acc;
  }, {} as Record<string, GalleryItem[]>);
