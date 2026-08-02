---
name: Electric Urban
colors:
  surface: '#1f0f0b'
  surface-dim: '#1f0f0b'
  surface-bright: '#49342e'
  surface-container-lowest: '#190a06'
  surface-container-low: '#281712'
  surface-container: '#2d1b16'
  surface-container-high: '#382620'
  surface-container-highest: '#44302a'
  on-surface: '#fcdcd3'
  on-surface-variant: '#e6beb2'
  inverse-surface: '#fcdcd3'
  inverse-on-surface: '#3f2c26'
  outline: '#ad897e'
  outline-variant: '#5c4037'
  surface-tint: '#ffb59e'
  primary: '#ffb59e'
  on-primary: '#5e1700'
  primary-container: '#ff571a'
  on-primary-container: '#521300'
  inverse-primary: '#ae3200'
  secondary: '#c6c6c7'
  on-secondary: '#2f3131'
  secondary-container: '#454747'
  on-secondary-container: '#b4b5b5'
  tertiary: '#a5c8ff'
  on-tertiary: '#00315e'
  tertiary-container: '#2492ff'
  on-tertiary-container: '#002a53'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbd0'
  primary-fixed-dim: '#ffb59e'
  on-primary-fixed: '#3a0b00'
  on-primary-fixed-variant: '#852400'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#d4e3ff'
  tertiary-fixed-dim: '#a5c8ff'
  on-tertiary-fixed: '#001c3a'
  on-tertiary-fixed-variant: '#004785'
  background: '#1f0f0b'
  on-background: '#fcdcd3'
  surface-variant: '#44302a'
typography:
  display-lg:
    fontFamily: montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
  headline-sm:
    fontFamily: montserrat
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 26px
  body-lg:
    fontFamily: inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  caption:
    fontFamily: inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
  display-lg-mobile:
    fontFamily: montserrat
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 12px
  margin: 16px
---

## Brand & Style
The design system is engineered for the high-velocity, high-energy world of Gen-Z social commerce. It captures the raw energy of urban Indian street culture, blending the immersive nature of short-form video with a friction-less shopping experience.

The visual direction is **High-Contrast / Bold**, utilizing a "Void" aesthetic where deep blacks provide the canvas for electric accents to vibrate. The UI should feel urgent, kinetic, and premium. Motion should be snappy and purposeful, mimicking the fast-paced scrolling and bargaining interactions typical of the target demographic.

## Colors
The palette is built on extreme contrast to ensure legibility under varied lighting conditions and to make product imagery pop.

- **Primary (Electric Coral):** Use exclusively for calls to action, active states, and "Live" indicators. It represents energy and the "NotWhat" spark.
- **Background (Void Black):** The #0A0A0A base ensures that OLED screens achieve true black, providing an infinite depth for video content.
- **Surface (Dark Steel):** Use #1A1A1A for cards, sheets, and persistent UI elements to create subtle separation from the background without breaking the high-contrast theme.
- **Secondary (Soft White):** Reserved for high-priority text and occasional "inverted" card styles to draw massive attention to featured products.

## Typography
The typography system uses a dual-font strategy. **Montserrat** provides the "loud" editorial voice for headings and price tags, while **Inter** handles the functional, data-heavy aspects of commerce and social interaction.

- **Headlines:** Always bold (700). Use tight letter spacing for a modern, compressed look.
- **Body:** Standard weights for readability. Use Inter Medium (500) for usernames and product titles.
- **Captions:** Extremely small (11px) but legible; used for timestamps, secondary metadata, and legal disclaimers.
- **Price Tags:** Should always be rendered in Montserrat Bold to emphasize the commerce aspect.

## Layout & Spacing
This design system utilizes a **Fixed Grid** model optimized for the iPhone 14 Pro (390px width). 

- **Grid:** 4-column grid for standard content; 2-column for product feeds.
- **Margins:** A strict 16px lateral margin for all text content. Edge-to-edge (0px) is reserved for video content and hero imagery.
- **Rhythm:** A 4px baseline grid ensures vertical consistency.
- **Safe Areas:** Adhere strictly to the iOS Dynamic Island and Home Indicator safe zones. Bottom navigation must account for the 34pt home indicator height.

## Elevation & Depth
Depth is achieved through **Tonal Layers** rather than traditional shadows. In a dark theme, shadows are often invisible; therefore, we use luminosity to signify height.

- **Level 0 (Base):** #0A0A0A (Background).
- **Level 1 (Cards/Sheets):** #1A1A1A (Surface).
- **Level 2 (Modals/Popovers):** #2A2A2A with a 1px #3A3A3A border.
- **Overlays:** Use a 70% black tint for backdrops behind modals. 
- **Focus States:** Elements like active inputs use an outer glow (0px 0px 8px #FF4D00) to simulate an "electric" light emission.

## Shapes
The shape language is dominated by **Pill-shaped (3)** geometry. This softness contrasts against the aggressive color palette, making the app feel approachable and touch-friendly.

- **Buttons:** Fully rounded (pill) ends.
- **Input Fields:** 12px corner radius (Rounded-LG).
- **Cards:** 16px corner radius (Rounded-XL) for product thumbnails and store banners.
- **Avatars:** Strictly circular (100% radius).

## Components

### Buttons
- **Primary:** Filled #FF4D00 with White text. Bold weight.
- **Secondary:** 1.5px border #FF4D00, no fill. 
- **Ghost:** White text, no border or fill. Used for "Skip" or "Cancel" actions.

### Input Fields
- Dark base (#1A1A1A) with a subtle #2A2A2A border. 
- On focus: Border changes to #FF4D00 with a subtle coral glow.
- Placeholder text: #8A8A8A.

### Bottom Navigation
- Fixed 5-tab bar with #0A0A0A background (90% opacity with backdrop blur).
- Icons: Outline (Inactive), Filled #FF4D00 (Active).
- No labels; the icons must be distinct enough to stand alone.

### Product & Social Cards
- **Product Card:** Portrait (3:4 aspect ratio). Product title in Inter Medium, Price in Montserrat Bold.
- **Reel Thumbnail:** 16:9 vertical. Overlay "Live" or "Bargain" badges in the top-left corner.
- **Badges:** Pill-shaped, #FF4D00 background with White text, uppercase Label-MD font style.

### Icons
- Use a 24px bounding box with a 2px stroke weight for consistency. 
- Key Icons: Gavel (Bargain), Bag (Shop), Play (Reels), Heart (Like).