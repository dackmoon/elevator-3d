/**
 * 20 个楼层的写实摄影级门外实景生图提示词配置
 * 统一构图约束：站在电梯门外平视向前望去、无前景电梯门框遮挡、水平地平线居中对齐、电影级真实光影
 */

export const COMMON_STYLE_SUFFIX =
  'eye-level architectural photography looking straight forward into an open spacious scene, completely unobstructed foreground, centered level horizon, 24mm wide-angle lens, photorealistic 8k, realistic global illumination and surface reflections, high dynamic range, no people in foreground';

export const COMMON_NEGATIVE_PROMPT =
  'elevator, lift, sliding doors, metal doors, doorframe, foreground frame, borders, hallway pillars blocking edges, looking back at a door, closed door in center, person, people, human, silhouette, text, watermark, logo, blurry, tilted camera, fisheye distortion, cartoon, plastic 3d render, lowres';

export const FLOOR_PROMPTS = [
  {
    index: 0,
    code: 'B2',
    displayLabel: 'B2',
    nameZh: '地下车库',
    prompt:
      'dimly lit modern underground parking garage at night, polished damp concrete floor with yellow parking bay lines, concrete pillars with black and yellow hazard stripes, sleek dark luxury sedan parked in the middle distance with subtle glowing red taillights, cool white fluorescent ceiling tubes casting moody reflections',
  },
  {
    index: 1,
    code: 'B1',
    displayLabel: 'B1',
    nameZh: '设备机房',
    prompt:
      'clean high-tech building mechanical utility room and engineering corridor, industrial steel floor grates, neatly arranged color-coded red blue and yellow insulated pipes along concrete walls, electrical control cabinets with green and amber indicator lights, warm tungsten industrial cage lamps',
  },
  {
    index: 2,
    code: '1',
    displayLabel: '1F',
    nameZh: '现代大堂',
    prompt:
      'grand luxury five-star hotel and skyscraper ground floor lobby at night, gleaming cream Italian marble floor, minimalist walnut and travertine reception desk in the distance, sculptural indoor olive trees, warm architectural cove lighting and contemporary brass ring chandelier, floor-to-ceiling glass showing city night lights outside',
  },
  {
    index: 3,
    code: '2',
    displayLabel: '2F',
    nameZh: '午夜咖啡吧',
    prompt:
      'cozy upscale midnight coffee lounge and artisan cafe interior, warm oak plank flooring, espresso bar counter with gleaming brass coffee machine and warm backlit shelves, round marble bistro tables, soft glowing amber pendant lamps, intimate rainy night atmosphere',
  },
  {
    index: 4,
    code: '3',
    displayLabel: '3F',
    nameZh: '健身俱乐部',
    prompt:
      'luxury high-rise private fitness club at night, dark matte rubber gym flooring, sleek modern treadmills and minimalist strength equipment arranged neatly, dark charcoal walls with dramatic warm coral and white linear LED architectural lighting, floor-to-ceiling windows overlooking night city lights',
  },
  {
    index: 5,
    code: '4',
    displayLabel: '4F',
    nameZh: '共享办公区',
    prompt:
      'contemporary Scandinavian-style co-working lounge in the evening, light oak wood desks, ergonomic designer chairs, glass-walled meeting rooms with soft warm light, indoor potted monstera plants, clean modern acoustic ceiling lighting',
  },
  {
    index: 6,
    code: '5',
    displayLabel: '5F',
    nameZh: '静谧图书馆',
    prompt:
      'serene luxury private library and reading room, floor-to-ceiling dark walnut bookshelves packed with hardcover books, warm brass library reading lamps with emerald green glass shades on a long mahogany table, rich herringbone wood floor, quiet scholarly atmosphere',
  },
  {
    index: 7,
    code: '6',
    displayLabel: '6F',
    nameZh: '创意工作室',
    prompt:
      'bright minimalist contemporary architecture and design studio loft, polished light concrete floor, large drafting tables with architectural models and color swatches, bold minimalist Bauhaus framed artwork on gallery-white walls, track spotlighting',
  },
  {
    index: 8,
    code: '7',
    displayLabel: '7F',
    nameZh: '科技研发层',
    prompt:
      'sleek futuristic technology research laboratory lobby, dark reflective slate floor, glass server rooms with tidy rows of glowing cyan blue LED hardware racks, minimalist white lab workstations, subtle cool teal architectural light strips',
  },
  {
    index: 9,
    code: '8',
    displayLabel: '8F',
    nameZh: '空中餐厅',
    prompt:
      'fine dining high-rise sky bistro restaurant at night, dimly lit romantic interior with white linen tables and glowing glass candle lamps, wine cellar glass wall softly illuminated in warm amber, panoramic windows displaying glittering city skyline',
  },
  {
    index: 10,
    code: '9',
    displayLabel: '9F',
    nameZh: '深夜写字楼',
    prompt:
      'quiet modern corporate skyscraper office corridor late at night, neat glass-partitioned workspaces, dark woven carpet floor, a few glowing computer monitors in the distance, softly lit green emergency exit sign down the hallway, calm nocturnal city glow through distant windows',
  },
  {
    index: 11,
    code: '10',
    displayLabel: '10F',
    nameZh: '空中连廊',
    prompt:
      'dramatic enclosed glass skybridge walkway high above a glittering metropolis at night, dark glossy stone walkway with recessed cyan floor guide lights on both sides, soaring glass walls and ceiling framing surrounding illuminated skyscrapers in light mist',
  },
  {
    index: 12,
    code: '11',
    displayLabel: '11F',
    nameZh: '金融交易层',
    prompt:
      'modern international financial trading floor after hours, sleek dark desks lined with curved multi-monitor screens glowing softly with subtle green and amber financial charts, glass partitions, sleek architectural steel ceiling and cool ambient night light',
  },
  {
    index: 13,
    code: '12',
    displayLabel: '12F',
    nameZh: '霓虹画廊',
    prompt:
      'avant-garde contemporary neon art gallery at night, mirror-polished dark basalt floor, glowing magenta and cyan vertical neon light installations framing a translucent glass geometric sculpture on a minimalist black plinth, dramatic reflections',
  },
  {
    index: 14,
    code: '13',
    displayLabel: '13F',
    nameZh: '禅意水景厅',
    prompt:
      'tranquil Japanese modern zen sanctuary indoors, calm dark shallow reflecting pool with natural stone stepping path, illuminated green bamboo grove against textured travertine stone walls, warm glowing paper lantern reflection on water',
  },
  {
    index: 15,
    code: '14',
    displayLabel: '14F',
    nameZh: '私享放映厅',
    prompt:
      'opulent private luxury cinema screening lounge, plush deep burgundy velvet reclining lounge seats facing a wide softly glowing projection screen in the distance, acoustic dark walnut wall panels with warm step lighting and carpeted aisle',
  },
  {
    index: 16,
    code: '15',
    displayLabel: '15F',
    nameZh: '空中温室',
    prompt:
      'lush high-rise indoor botanical sky conservatory at night, timber boardwalk path surrounded by tropical ferns, palms and mossy stone planters, warm golden uplighting and tiny floating warm fairy lights beneath a towering glass atrium roof',
  },
  {
    index: 17,
    code: '16',
    displayLabel: '16F',
    nameZh: '云端酒吧',
    prompt:
      'chic luxury rooftop sky bar lounge at night, backlit onyx cocktail bar counter with crystal glassware, velvet lounge booths, atmospheric violet and warm amber accent lighting, dramatic floor-to-ceiling windows overlooking rainy neon metropolis skyline',
  },
  {
    index: 18,
    code: '17',
    displayLabel: '17F',
    nameZh: '行政会所',
    prompt:
      'exclusive penthouse executive club lounge, cognac leather armchairs around a brushed brass coffee table, warm fireplace glow set into dark marble wall, rich walnut paneling, refined warm indirect lighting and expansive night city view',
  },
  {
    index: 19,
    code: '18',
    displayLabel: '18F',
    nameZh: '星空天台',
    prompt:
      'completely empty uninhabited open-air luxury skyscraper rooftop observation terrace at night looking straight out toward the distant open horizon, sleek dark wet stone deck extending forward to a low minimalist frameless glass safety railing with subtle violet floor LED trim at the far edge, minimalist modern stone bench off to the side, sweeping unobstructed panoramic view of glittering skyscrapers far below under a vast deep blue starry night sky with a bright full moon, completely deserted empty deck with zero people',
  },
];
