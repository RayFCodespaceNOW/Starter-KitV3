# AURORA Mars Mission Concept

A static educational site about a fictional crewed mission to Mars.

## Run locally

From the project directory:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Main files

- `index.html` contains the overview and scroll-driven mission sequence.
- `mission-scroll.js` moves the homepage timeline marker and activates launch, transit, and Mars surface story cards as the visitor scrolls.
- `spacecraft-viewer.js` loads the Sketchfab GLB on the Spacecraft page and pans/zooms between labeled mesh regions as its chapters scroll into view.
- `css/mission.css` provides the shared site styles.
- `nav.js` controls the responsive navigation.
- `about.html`, `projects.html`, `reviews.html`, `contact.html`, and `reference.html` contain the supporting pages.

## Resources

The spacecraft model is credited on the Reference page. Three.js 0.180.0 and its GLTFLoader are loaded from jsDelivr. The site uses locally hosted Roboto font files. Image credits and project documents are listed on the Reference page.
