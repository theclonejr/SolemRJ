import re

css_path = 'c:\\Users\\thecl\\Desktop\\solemProject\\styles.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Replace the themes in :root and data-theme
themes = """:root {
    /* Theme 1: Plum-Tech (Default Mobile-First) */
    --bg-deep: #000010;
    --bg-shadow: #0C1024;
    --plum-mid: #544658;
    --plum-light: #877D8B;
    --silk-glow: #CBB8C1;
    --text-primary: #CBB8C1;
    --text-secondary: #877D8B;

    --card-plum-bg: rgba(84, 70, 88, 0.4);
    --card-navy-bg: rgba(12, 16, 36, 0.6);
    --card-coral-bg: rgba(203, 184, 193, 0.2); 
    --card-mint-bg: rgba(135, 125, 139, 0.2); 

    /* Typography */
    --font-display: 'Outfit', sans-serif;
    --font-body: 'Plus Jakarta Sans', sans-serif;

    /* Spacing */
    --section-padding: clamp(60px, 10vw, 120px) 0;
}

[data-theme="cyber-mint"] {
    /* Theme 2: Cyber-Mint */
    --bg-deep: #0B0B0C;
    --bg-shadow: #121215;
    --plum-mid: #4A4A4A;
    --plum-light: #C0C0C0;
    --silk-glow: #00FF87;
    --text-primary: #00FF87;
    --text-secondary: #C0C0C0;

    --card-plum-bg: rgba(192, 192, 192, 0.2);
    --card-navy-bg: rgba(21, 21, 24, 0.6);
    --card-coral-bg: rgba(74, 74, 74, 0.3);
    --card-mint-bg: rgba(0, 255, 135, 0.2);
}

[data-theme="earth-tones"] {
    /* Theme 3: Earth/Coffee */
    --bg-deep: #5E3023;
    --bg-shadow: #895737;
    --plum-mid: #C08552;
    --plum-light: #DAB49D;
    --silk-glow: #F3E9DC;
    --text-primary: #F3E9DC;
    --text-secondary: #DAB49D;

    --card-plum-bg: rgba(218, 180, 157, 0.2);
    --card-navy-bg: rgba(137, 87, 55, 0.6);
    --card-coral-bg: rgba(192, 133, 82, 0.3);
    --card-mint-bg: rgba(243, 233, 220, 0.2);
}

[data-theme="sunset-vibes"] {
    /* Theme 4: Sunset */
    --bg-deep: #4F000B;
    --bg-shadow: #720026;
    --plum-mid: #CE4257;
    --plum-light: #FF7F51;
    --silk-glow: #FF9B54;
    --text-primary: #FF9B54;
    --text-secondary: #FF7F51;

    --card-plum-bg: rgba(255, 127, 81, 0.2);
    --card-navy-bg: rgba(114, 0, 38, 0.6);
    --card-coral-bg: rgba(206, 66, 87, 0.3);
    --card-mint-bg: rgba(255, 155, 84, 0.2);
}

[data-theme="mono-red"] {
    /* Theme 5: Mono-Red */
    --bg-deep: #0B090A;
    --bg-shadow: #161A1D;
    --plum-mid: #660708;
    --plum-light: #BA181B;
    --silk-glow: #E5383B;
    --text-primary: #FFFFFF;
    --text-secondary: #A4161A;

    --card-plum-bg: rgba(164, 22, 26, 0.2);
    --card-navy-bg: rgba(22, 26, 29, 0.6);
    --card-coral-bg: rgba(186, 24, 27, 0.3);
    --card-mint-bg: rgba(229, 56, 59, 0.2);
}"""

css = re.sub(r':root\s*\{.*?\}\s*\[data-theme="mono-red"\]\s*\{.*?\}', themes, css, flags=re.DOTALL)

# Fluid Typography & Stacking
css = css.replace('font-size: 3.5rem;', 'font-size: clamp(2rem, 5vw, 3.5rem);')
css = css.replace('font-size: 5rem;', 'font-size: clamp(2.5rem, 8vw, 5rem);')

# Find Desktop-only styles and move them to min-width: 968px
# First, apply mobile-first to base
css = re.sub(r'\.navbar\s*\{(.*?)\}', r'.navbar {\1}', css, flags=re.DOTALL)
# Make hamburger block and desktop-nav none in base
css = css.replace('.hamburger {\n    display: none;', '.hamburger {\n    display: flex;')
css = css.replace('.desktop-nav {\n', '.desktop-nav {\n    display: none;\n')
css = css.replace('.desktop-only {\n', '.desktop-only {\n    display: none !important;\n')
css = css.replace('grid-template-columns: repeat(3, 1fr);', 'grid-template-columns: 1fr;')
css = css.replace('grid-template-columns: 1fr 1fr;', 'grid-template-columns: 1fr;')

# Ensure min-width: 968px block exists
desktop_media_query = """

@media (min-width: 968px) {
    .desktop-nav { display: flex; }
    .desktop-only { display: inline-flex !important; }
    .hamburger { display: none; }
    .services-grid { grid-template-columns: repeat(3, 1fr); }
    .empowerment-content { grid-template-columns: 1fr 1fr; }
    .contact-container { grid-template-columns: 1fr 1fr; }
    .span-2 { grid-column: span 2; }
    .span-row-2 { grid-row: span 2; }
    .tall { grid-row: span 2; }
}
"""

# Remove max-width media queries for these changes, replace them with our min-width approach
css = re.sub(r'@media \(max-width: 1024px\)\s*\{.*?\}', '', css, flags=re.DOTALL)
css = re.sub(r'@media \(max-width: 768px\)\s*\{.*?\}', '', css, flags=re.DOTALL)

css += desktop_media_query

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)

print("Styles refactored for Mobile-First.")
